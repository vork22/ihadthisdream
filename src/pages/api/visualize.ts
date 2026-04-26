import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import Redis from "ioredis";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Vercel serverless function — not prerendered.
export const prerender = false;

// Stage 1 prompt: Claude distills the dream into a symbolic visual brief suitable
// for the woodcut illustrator. This doubles as a content-safety filter — trauma,
// explicit content, and modern specifics are sublimated into archetypal imagery
// the way a 14th-century engraver would have depicted them.
const DISTILL_SYSTEM = `You are a visual designer translating dreams into symbolic images for a medieval woodcut. Given a dream described by the dreamer, output a 2-3 sentence visual brief describing what to depict in the woodcut.

Rules:
- Use concrete, symbolic imagery drawn from classical dream iconography (figures, creatures, trees, water, celestial bodies, thresholds, objects, archetypes).
- Distill the dream's emotional core and key symbols — don't re-narrate every detail.
- Never include modern specifics (cars, phones, cities, laptops, brand names, specific people's names). Translate to archetypal equivalents: a car becomes "a dark horse" or "a horseless carriage"; a phone becomes "a distant voice carried on the wind"; a specific person becomes "a beloved figure" or "a stranger with a familiar face"; explicit brands become generic objects.
- Sublimate violence, sex, death, and traumatic specifics into symbolic equivalents a 14th-century engraver would have used (a sword, a dark wave, a covered face, a locked door, a shadow figure, a fallen bird).
- Single cohesive scene suitable for ONE woodcut image.
- Plain prose. Single paragraph. 2-3 sentences. No bullet points, no quotation marks, no preamble.

Return ONLY the brief.`;

// Stage 2 prompt: woodcut renderer. Identical style lock to the batch script so
// user-generated images match the 163 dictionary images exactly.
const MASTER_PROMPT = (brief: string) => `A primitive medieval woodcut depicting: ${brief}

Rough hand-carved linework with visible knife and chisel marks, thick bold outlines, slight asymmetry, a naive folk-art quality. Style of 14th–15th century block-book illustrations before Dürer's refinement — Biblia Pauperum, Ars Moriendi, early European block prints.

Heavy black ink on a completely flat, solid, uniform warm cream background — exact color #fbf6ef (warm off-white parchment, slightly peachy, NOT white, NOT gray, NOT blue). The cream must fill the entire square canvas edge to edge with no gradient, no vignette, no aged-paper texture, no stains, no noise, no fiber, no scan artifacts — a perfectly flat solid field of color #fbf6ef. Simplified forms, chunky silhouette, short bold parallel strokes for shadow only — no fine crosshatching.

Single cohesive scene centered with generous margin around it. Absolutely no decorative border, no frame, no rectangle outline, no color in the subject (only black ink), no text, no lettering, no signature, no watermark. Match the linework weight, chisel quality, and primitive mood of the attached reference image.`;

const IMAGE_MODEL = "gpt-image-2";
// GPT Image 2 accepts custom square sizes when both edges are multiples of 16
// and total pixels are >= 655,360. 816^2 is the smallest square over that
// threshold, which is faster/cheaper than 1024 while still large enough for UI.
const IMAGE_SIZE = "816x816";
const IMAGE_QUALITY = "low";
const CACHE_VERSION = `${IMAGE_MODEL}:${IMAGE_SIZE}:${IMAGE_QUALITY}:woodcut-v1`;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

// ---------- style anchor: read once, cached across warm invocations ----------

// Vercel's adapter (with includeFiles in astro.config.mjs) ships
// scripts/style-anchor.png into the function bundle, but the exact disk layout
// inside .vercel/output/functions/api/visualize.func/ depends on adapter
// version, so we try several plausible paths and use the first one that
// exists. Locally, __dirname resolves into src/pages/api/, so the
// "../../../scripts/style-anchor.png" form works in dev.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR_CANDIDATES = [
  // Local dev (Astro): src/pages/api → ../../../scripts/...
  path.resolve(__dirname, "../../../scripts/style-anchor.png"),
  // Vercel bundle: dist/server/pages/api → ../../../../scripts/...
  path.resolve(__dirname, "../../../../scripts/style-anchor.png"),
  // Vercel runtime cwd is typically the function root
  path.resolve(process.cwd(), "scripts/style-anchor.png"),
  // Belt-and-suspenders absolute path inside the bundle
  path.resolve(process.cwd(), ".vercel/output/functions/_render.func/scripts/style-anchor.png"),
];
// Eagerly load the anchor at module init so a missing-file error surfaces
// in Vercel function logs immediately and we can short-circuit the handler
// before incrementing the per-IP rate-limit counter.
let anchorBytesCache: Buffer | null = null;
let anchorLoadError: string | null = null;
(function loadAnchor() {
  for (const candidate of ANCHOR_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        anchorBytesCache = fs.readFileSync(candidate);
        return;
      }
    } catch {
      /* try next candidate */
    }
  }
  anchorLoadError = `style-anchor.png not found. Tried: ${ANCHOR_CANDIDATES.join(", ")}`;
  // eslint-disable-next-line no-console
  console.error("[visualize] " + anchorLoadError);
})();
function getAnchorBytes(): Buffer {
  if (anchorBytesCache) return anchorBytesCache;
  throw new Error(anchorLoadError || "style-anchor.png not loaded");
}

// ---------- redis (reuses interpret.ts pattern) ----------

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisClient) {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2000,
      enableOfflineQueue: true,
    });
    redisClient.on("error", () => {
      /* swallowed — never break the API path */
    });
  }
  return redisClient;
}

// ---------- rate limit: 10 visualizations per IP per 24 hours ----------

// Cap image generation at 10/day/IP. Interpretation (/api/interpret) has no
// such limit — dreamers can still get a written reading on every submission.
// An 11th+ dream in the same day just quietly skips the woodcut step rather
// than surfacing an error (see DreamChat.tsx — non-OK responses silently
// clear the loading state, preserving the reading experience).
const RATE_LIMIT_PER_DAY = 10;
const IP_SALT = "ihtd-visualize-v1";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + IP_SALT)
    .digest("hex")
    .slice(0, 16);
}

function normalizeDreamForCache(dream: string): string {
  return dream.trim().replace(/\s+/g, " ");
}

function hashDream(dream: string): string {
  return crypto
    .createHash("sha256")
    .update(`${CACHE_VERSION}\n${normalizeDreamForCache(dream)}`)
    .digest("hex")
    .slice(0, 32);
}

type CachedVisualization = {
  image: string;
  brief: string;
  cachedAt: number;
};

async function getCachedVisualization(
  r: Redis | null,
  dreamHash: string,
): Promise<CachedVisualization | null> {
  if (!r) return null;
  try {
    const raw = await r.get(`visualize:cache:${dreamHash}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedVisualization;
    if (typeof cached.image !== "string" || typeof cached.brief !== "string") {
      return null;
    }
    await r.incr("visualize:counts:cache_hits");
    return cached;
  } catch {
    return null;
  }
}

async function checkRateLimit(
  r: Redis | null,
  ipHash: string,
): Promise<{ allowed: boolean; count: number }> {
  if (!r) return { allowed: true, count: 0 };
  const key = `visualize:ip:${ipHash}`;
  try {
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, 86400);
    return { allowed: count <= RATE_LIMIT_PER_DAY, count };
  } catch {
    return { allowed: true, count: 0 };
  }
}

// ---------- helpers ----------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------- handler ----------

type Incoming = { dream?: string };

export const POST: APIRoute = async ({ request }) => {
  const anthropicKey =
    import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const openaiKey =
    import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!anthropicKey) {
    return json(500, { error: "ANTHROPIC_API_KEY not set on the server." });
  }
  if (!openaiKey) {
    return json(500, { error: "OPENAI_API_KEY not set on the server." });
  }
  if (anchorLoadError) {
    return json(500, { error: anchorLoadError });
  }

  let body: Incoming;
  try {
    body = (await request.json()) as Incoming;
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const dream = (body.dream || "").trim();
  if (dream.length < 10) {
    return json(400, { error: "Please describe your dream a bit more." });
  }
  if (dream.length > 4000) {
    return json(400, { error: "Dream text exceeds 4000 characters." });
  }

  // Rate limit check BEFORE any paid API call
  const r = getRedis();
  const dreamHash = hashDream(dream);
  const cached = await getCachedVisualization(r, dreamHash);
  if (cached) {
    return json(200, {
      image: cached.image,
      brief: cached.brief,
      cached: true,
    });
  }

  // Only uncached generations count against the daily quota.
  const ipHash = hashIp(getClientIp(request));
  const { allowed, count } = await checkRateLimit(r, ipHash);
  if (!allowed) {
    return json(429, {
      error: `You've reached today's limit of ${RATE_LIMIT_PER_DAY} visualizations. Please try again tomorrow.`,
    });
  }

  try {
    // Stage 1 — Claude distillation
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const distillResp = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 220,
      system: DISTILL_SYSTEM,
      messages: [{ role: "user", content: dream }],
    });
    const brief = distillResp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!brief) throw new Error("Distillation returned empty text");

    // Stage 2 — OpenAI gpt-image-2 with locked style anchor
    const openai = new OpenAI({ apiKey: openaiKey });
    const anchor = await toFile(getAnchorBytes(), "anchor.png", {
      type: "image/png",
    });

    const imageResp = await openai.images.edit({
      model: IMAGE_MODEL,
      image: anchor,
      prompt: MASTER_PROMPT(brief),
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
      n: 1,
    });

    const b64 = imageResp.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image API returned no data");

    // Anonymous analytics — fire-and-forget-style, wrapped so we never reject
    // a successful visualization due to a Redis hiccup.
    if (r) {
      try {
        const pipe = r.pipeline();
        pipe.setex(
          `visualize:cache:${dreamHash}`,
          CACHE_TTL_SECONDS,
          JSON.stringify({
            image: `data:image/png;base64,${b64}`,
            brief,
            cachedAt: Date.now(),
          } satisfies CachedVisualization),
        );
        pipe.incr("visualize:counts:total");
        pipe.lpush(
          "visualize:briefs",
          JSON.stringify({ t: Date.now(), brief: brief.slice(0, 500) }),
        );
        pipe.ltrim("visualize:briefs", 0, 999);
        await pipe.exec();
      } catch {
        /* analytics must never break the user path */
      }
    }

    return json(200, {
      image: `data:image/png;base64,${b64}`,
      brief,
      remaining: Math.max(0, RATE_LIMIT_PER_DAY - count),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    // Don't leak upstream moderation details to the UI. Log server-side only.
    // eslint-disable-next-line no-console
    console.error("[visualize] failed:", message, stack || "");
    return json(502, {
      error:
        "This dream resisted rendering. Try again in a moment, or try a different wording.",
    });
  }
};
