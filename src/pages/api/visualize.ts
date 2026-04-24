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

Heavy black ink on a completely flat, solid, uniform warm cream background — exact color #fbf6ef (warm off-white parchment, slightly peachy, NOT white, NOT gray, NOT blue). The cream must fill the entire 1024x1024 canvas edge to edge with no gradient, no vignette, no aged-paper texture, no stains, no noise, no fiber, no scan artifacts — a perfectly flat solid field of color #fbf6ef. Simplified forms, chunky silhouette, short bold parallel strokes for shadow only — no fine crosshatching.

Single cohesive scene centered with generous margin around it. Absolutely no decorative border, no frame, no rectangle outline, no color in the subject (only black ink), no text, no lettering, no signature, no watermark. Match the linework weight, chisel quality, and primitive mood of the attached reference image.`;

// ---------- style anchor: read once, cached across warm invocations ----------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLE_ANCHOR_PATH = path.resolve(
  __dirname,
  "../../../scripts/style-anchor.png",
);
let anchorBytesCache: Buffer | null = null;
function getAnchorBytes(): Buffer {
  if (!anchorBytesCache) {
    anchorBytesCache = fs.readFileSync(STYLE_ANCHOR_PATH);
  }
  return anchorBytesCache;
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

// ---------- rate limit: 3 visualizations per IP per 24 hours ----------

// Cap image generation at 3/day/IP. Interpretation (/api/interpret) has no
// such limit — dreamers can still get a written reading on every submission.
// A 4th+ dream in the same day just quietly skips the woodcut step rather
// than surfacing an error (see DreamChat.tsx — non-OK responses silently
// clear the loading state, preserving the reading experience).
const RATE_LIMIT_PER_DAY = 3;
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
      model: "gpt-image-2",
      image: anchor,
      prompt: MASTER_PROMPT(brief),
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });

    const b64 = imageResp.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image API returned no data");

    // Anonymous analytics — fire-and-forget-style, wrapped so we never reject
    // a successful visualization due to a Redis hiccup.
    if (r) {
      try {
        const pipe = r.pipeline();
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
    // Don't leak upstream moderation details to the UI. Log server-side only.
    // eslint-disable-next-line no-console
    console.error("[visualize] failed:", message);
    return json(502, {
      error:
        "This dream resisted rendering. Try again in a moment, or try a different wording.",
    });
  }
};
