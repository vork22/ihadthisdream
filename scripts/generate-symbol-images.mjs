#!/usr/bin/env node
// Generate woodcut-style symbol images for every entry in src/content/symbols/.
// Uses OpenAI's gpt-image-2 (by default) with a locked style-anchor reference
// image passed on every call, so all 163 symbols share a consistent
// primitive/medieval block-book aesthetic. v2 bakes the cream site background
// (#fbf6ef) directly into each PNG since v2 doesn't support transparent.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/generate-symbol-images.mjs
//   node scripts/generate-symbol-images.mjs --only=snake,tree --force
//   node scripts/generate-symbol-images.mjs --dry-run
//   node scripts/generate-symbol-images.mjs --quality=high
//
// Flags:
//   --only=slug[,slug]   Restrict to a specific set of slugs.
//   --force              Overwrite existing PNGs.
//   --dry-run            Print what would be generated, skip API calls.
//   --quality=Q          low | medium | high (default: medium, ~$0.04/image)
//   --concurrency=N      Parallel in-flight requests (default: 4).
//   --model=ID           gpt-image-2 (default, cream background baked in)
//                        | gpt-image-1 (transparent PNG support)
//   --out-dir=PATH       Output dir, relative to repo root
//                        (default: public/assets/symbols)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI, { toFile } from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Auto-load .env from repo root so `node scripts/generate-symbol-images.mjs`
// just works without having to remember to `source .env` or use dotenv-cli.
(function loadDotenv() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const SYMBOLS_DIR = path.join(repoRoot, "src/content/symbols");
const DEFAULT_OUT_DIR = "public/assets/symbols";
const STYLE_ANCHOR = path.join(repoRoot, "scripts/style-anchor.png");

// ---------- master prompt (locked; SUBJECT is the only variable) ----------

// Background spec differs by model: gpt-image-1/1.5 accept a transparent PNG via
// the `background: "transparent"` param. gpt-image-2 does not support
// transparent backgrounds, so we instruct it to paint a flat warm cream
// (#fbf6ef, matching the site's --color-bg) directly into the image.
const CREAM_HEX = "#fbf6ef";

function backgroundInstruction(modelId) {
  if (modelId === "gpt-image-2") {
    return `Heavy black ink on a completely flat, solid, uniform warm cream background — exact color ${CREAM_HEX} (warm off-white parchment, slightly peachy, NOT white, NOT gray, NOT blue). The cream must fill the entire 1024x1024 canvas edge to edge with no gradient, no vignette, no aged-paper texture, no stains, no noise, no fiber, no scan artifacts — a perfectly flat solid field of color ${CREAM_HEX}.`;
  }
  return `Heavy black ink on a clean transparent background.`;
}

const MASTER_PROMPT = (subject, modelId) => `A primitive medieval woodcut of ${subject}.

Rough hand-carved linework with visible knife and chisel marks, thick bold outlines, slight asymmetry, a naive folk-art quality. Style of 14th–15th century block-book illustrations before Dürer's refinement — Biblia Pauperum, Ars Moriendi, early European block prints.

${backgroundInstruction(modelId)} Simplified forms, chunky silhouette, short bold parallel strokes for shadow only — no fine crosshatching. Slightly coarse hand-printed feel with occasional imperfections.

Single subject centered with generous margin around it. Absolutely no decorative border, no frame, no rectangle outline, no color in the subject (only black ink), no text, no lettering, no signature, no watermark. Match the linework weight, chisel quality, and primitive mood of the attached reference image.`;

// ---------- per-slug subject overrides for abstract symbols ----------
// These swap the raw term for a concrete visual that reads well as a woodcut.
// Extend freely during QC.

const OVERRIDES = {
  // Jungian archetypes
  anima: "a feminine figure rising from still water, shoulders above the waterline, long hair, eyes closed",
  animus: "a striding masculine figure holding a staff under a crescent moon",
  shadow: "a cloaked dark figure silhouetted in an open doorway",
  "divine-child": "a glowing infant cradled between two kneeling figures",
  "great-mother": "a seated matriarchal figure with outstretched arms, a moon above her",
  "wise-old-man": "a bearded elder in a hooded robe holding a lantern",
  witch: "a cloaked woman stirring a cauldron, moon overhead",
  "doppelg-nger": "two identical figures facing each other as mirror images",

  // Abstract states / actions
  breath: "a sleeping face exhaling a spiral of visible breath",
  birth: "a mother seated, cradling a newborn",
  "being-chased": "a figure running, looking back over their shoulder at a looming shadow",
  "being-late": "a figure hurrying past a clock tower, cloak flying",
  "being-lost": "a small figure standing in a deep forest at a fork in the path",
  "being-unprepared": "a figure standing at a lectern holding empty hands, a blank scroll at their feet",
  cheating: "two figures whispering behind a third who stands turned away",
  "death-of-self": "a skeletal figure rising from a tomb holding an hourglass",
  drowning: "a single hand reaching up from a churning sea",
  flying: "a figure with outstretched arms soaring above a small village",
  kissing: "two figures embracing in profile, foreheads touching",
  // Safety-aware rewrite: convey the classic "naked in public" dream (vulnerability, exposure, shame) via a cloaked figure and averted onlookers, without literal nudity.
  nakedness: "a solitary robed figure standing at the center of a great hall under the gaze of many faceless hooded onlookers, head bowed, hands clasped in front, deeply ashamed",
  falling: "a small tunic-clad figure tumbling through empty space, arms outstretched",

  // Abstract spaces
  threshold: "an open stone doorway standing alone, dark interior beyond",
  crossroads: "two dirt roads crossing in an open field under a single tree",
  labyrinth: "a square maze seen from above, one figure at the entrance",

  // Concepts
  // Safety-aware: conveys grounding + nurture + generative principle without the gloss's "mother / body" trigger words.
  earth: "a round globe etched with continents, mountains, and rivers, cradled in two large cupped hands rising from below, a single sapling sprouting from its top",
  self: "a mandala with a single central eye",
  skin: "a snake's shed skin lying across a branch",
  ashes: "a small pile of ashes with a single ember still glowing",
  dew: "droplets of water clinging to a single blade of grass",
  eclipse: "a dark disc covering the sun with a bright corona around it",
  mandala: "a concentric circular mandala with fourfold symmetry, a single point at the center",

  // Death / loved ones
  "dead-loved-one": "a seated figure with a translucent companion standing behind them, hand on shoulder",

  // Body parts
  hair: "long flowing hair cascading downward",
  hands: "a pair of open hands, palms up, side by side",
  feet: "a pair of bare feet walking, viewed from the side",
  eye: "a single open eye with long lashes, rays emanating outward",
  heart: "an anatomical heart with flames rising from it",
  teeth: "a single tooth falling, with two more loose beside it",
  bones: "a simple cross of two crossed bones with a skull above",
  blood: "a single drop of blood falling onto a pale surface",
};

// ---------- args ----------

const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(`--${name}`);
}
function opt(name, defaultValue) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : defaultValue;
}

const force = flag("force");
const dryRun = flag("dry-run");
const onlyArg = opt("only", "");
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim()).filter(Boolean)) : null;
const quality = opt("quality", "medium"); // low | medium | high
const concurrency = Math.max(1, parseInt(opt("concurrency", "4"), 10));
const model = opt("model", "gpt-image-2");
const OUT_DIR = path.resolve(repoRoot, opt("out-dir", DEFAULT_OUT_DIR));

// ---------- frontmatter parse ----------

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const block = match ? match[1] : "";
  const get = (key) => {
    const m = block.match(new RegExp(`^${key}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"));
    return m ? m[1] : "";
  };
  return { term: get("term"), gloss: get("gloss") };
}

// ---------- job planning ----------

function planJobs() {
  if (!fs.existsSync(SYMBOLS_DIR)) {
    console.error(`No symbols directory at ${SYMBOLS_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SYMBOLS_DIR).filter((f) => f.endsWith(".md"));
  const jobs = [];
  const skipped = [];

  for (const file of files) {
    const slug = path.basename(file, ".md");
    if (only && !only.has(slug)) continue;

    const outPath = path.join(OUT_DIR, `${slug}.png`);
    if (!force && fs.existsSync(outPath)) {
      skipped.push(slug);
      continue;
    }

    const { term, gloss } = parseFrontmatter(path.join(SYMBOLS_DIR, file));
    const subject =
      OVERRIDES[slug] ||
      (gloss ? `${term.toLowerCase()} — ${gloss.toLowerCase()}` : term.toLowerCase());
    const prompt = MASTER_PROMPT(subject, model);

    jobs.push({ slug, outPath, subject, prompt });
  }

  return { jobs, skipped };
}

// ---------- API call ----------

async function generateOne(client, job) {
  // Re-open a fresh File handle per call (streams can't be reused).
  const anchor = await toFile(fs.createReadStream(STYLE_ANCHOR), "anchor.png", {
    type: "image/png",
  });
  const supportsTransparent = model !== "gpt-image-2";
  const resp = await client.images.edit({
    model,
    image: anchor,
    prompt: job.prompt,
    size: "1024x1024",
    ...(supportsTransparent ? { background: "transparent" } : {}),
    quality,
    n: 1,
  });
  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("API returned no image data");
  fs.writeFileSync(job.outPath, Buffer.from(b64, "base64"));
}

async function runWithRetry(client, job, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await generateOne(client, job);
      return { ok: true };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const backoff = 1500 * attempt;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  return { ok: false, err: lastErr };
}

// ---------- concurrency pool ----------

async function runPool(jobs, worker) {
  const queue = jobs.slice();
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      await worker(job);
    }
  });
  await Promise.all(workers);
}

// ---------- main ----------

async function main() {
  if (!fs.existsSync(STYLE_ANCHOR)) {
    console.error(`Missing style anchor at ${STYLE_ANCHOR}`);
    process.exit(1);
  }

  const { jobs, skipped } = planJobs();

  console.log(`Model:        ${model}`);
  console.log(`Style anchor: ${path.relative(repoRoot, STYLE_ANCHOR)}`);
  console.log(`Output dir:   ${path.relative(repoRoot, OUT_DIR)}`);
  console.log(`Quality:      ${quality}`);
  console.log(`Concurrency:  ${concurrency}`);
  console.log(`To generate:  ${jobs.length}`);
  console.log(`Already done: ${skipped.length}`);
  if (only) console.log(`Filter:       only=${[...only].join(",")}`);
  console.log();

  if (dryRun) {
    for (const j of jobs) console.log(`[plan] ${j.slug}  ←  ${j.subject}`);
    return;
  }

  if (jobs.length === 0) {
    console.log("Nothing to do. Pass --force to regenerate or --only=... to target.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Export it in your shell and retry.");
    process.exit(1);
  }

  const client = new OpenAI();
  const start = Date.now();
  let done = 0;
  const failures = [];

  await runPool(jobs, async (job) => {
    const t0 = Date.now();
    const result = await runWithRetry(client, job);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (result.ok) {
      done++;
      console.log(
        `[${done}/${jobs.length}] ${job.slug}  →  ${path.relative(repoRoot, job.outPath)}  (${elapsed}s)`,
      );
    } else {
      failures.push(job.slug);
      console.error(`[fail] ${job.slug}  (${elapsed}s): ${result.err?.message ?? result.err}`);
    }
  });

  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1);
  const perImage = { low: 0.011, medium: 0.042, high: 0.167 }[quality] ?? 0.042;
  const estCost = (done * perImage).toFixed(2);

  console.log();
  console.log(`Done: ${done}/${jobs.length} in ${totalElapsed}s  (est ~$${estCost} at ${quality} quality)`);
  if (failures.length) {
    console.log();
    console.log(`Failed (${failures.length}):`);
    console.log(`  ${failures.join(",")}`);
    console.log(
      `Retry:\n  node scripts/generate-symbol-images.mjs --only=${failures.join(",")} --force`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
