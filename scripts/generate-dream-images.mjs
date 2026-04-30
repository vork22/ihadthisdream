#!/usr/bin/env node
// Generate woodcut illustrations for common-dream pages under src/content/dreams/.
// Same locked style as scripts/generate-symbol-images.mjs (style-anchor reference).
//
// Usage:
//   node scripts/generate-dream-images.mjs
//   node scripts/generate-dream-images.mjs --only=falling,flying --force
//   node scripts/generate-dream-images.mjs --dry-run
//
// Flags match generate-symbol-images.mjs (quality, concurrency, model, etc.)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI, { toFile } from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

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

const DREAMS_DIR = path.join(repoRoot, "src/content/dreams");
const DEFAULT_OUT_DIR = "public/assets/dreams";
const STYLE_ANCHOR = path.join(repoRoot, "scripts/style-anchor.png");

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

/** Concrete dream-motif visuals — same safety patterns as symbol overrides where needed. */
const DREAM_OVERRIDES = {
  "being-chased": "a terrified figure sprinting, glancing back at a looming shadow-beast closing behind",
  baby: "a swaddled infant asleep in a wooden cradle, moon through window",
  "being-late": "a hurrying figure with loose papers, rushing past a bell tower as sand drains from an hourglass",
  "cheating-being-cheated-on": "two hooded figures whispering behind a curtain while a third stands apart, head bowed",
  death: "a robed skeleton holding an hourglass beside an open grave under bare trees",
  "dead-loved-one": "a seated mourner with a gentle translucent figure resting a hand on their shoulder",
  "driving-an-out-of-control-car": "a primitive carriage careening downhill, driver wrenching the reins, wheels lifting",
  "exam-unprepared": "an empty scholar's bench with blank parchment, broken quill, hourglass nearly empty",
  falling: "a small figure tumbling through a starry void, robes streaming upward",
  "finding-money": "gold coins spilling from a cracked clay jar onto cobblestones",
  fire: "flames roaring from the roof of a timber cottage, lone bucket below",
  flood: "figures stranded on a peaked rooftop surrounded by endless rising water",
  flying: "a robed dreamer soaring arms-wide above miniature rooftops and church spires",
  house: "a tall timber-framed dwelling with glowing windows, smoke from chimney, moon above",
  "lost-can-t-find-the-way": "a traveler with staff standing at a foggy fork where three paths vanish",
  "naked-in-public": "a fully robed figure frozen at the center of a market square while many hooded onlookers stare, figure clutching their cloak in shame",
  "old-house-childhood-home": "a small childhood cottage with familiar crooked door and climbing roses",
  pregnancy: "a seated woman in flowing robes cradling her rounded belly, eyes closed peacefully",
  "school-old-classroom":
    "rows of empty wooden desks facing a chalkboard in an old schoolroom, sunlight shaft",
  snake: "a thick serpent coiled upright around a wooden staff",
  spiders: "an enormous spider descending on a silk thread toward a sleeping dreamer below",
  storm: "a lone ship tossed between mountainous waves beneath forked lightning",
  "teeth-falling-out": "an open palm catching loose teeth falling like pale seeds from above",
  water: "endless still water reflecting moon and stars, a single ripple",
};

function parseDreamFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const block = match ? match[1] : "";

  function field(key) {
    const line = block.split(/\r?\n/).find((l) => new RegExp(`^${key}:`).test(l.trim()));
    if (!line) return "";
    const rest = line.replace(new RegExp(`^${key}:\\s*`), "").trim();
    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      return rest.slice(1, -1);
    }
    return rest.replace(/^["']|["']$/g, "");
  }

  return {
    title: field("title"),
    slug: field("slug"),
    excerpt: field("excerpt"),
  };
}

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
const quality = opt("quality", "medium");
const concurrency = Math.max(1, parseInt(opt("concurrency", "4"), 10));
const model = opt("model", "gpt-image-2");
const OUT_DIR = path.resolve(repoRoot, opt("out-dir", DEFAULT_OUT_DIR));

function planJobs() {
  if (!fs.existsSync(DREAMS_DIR)) {
    console.error(`No dreams directory at ${DREAMS_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(DREAMS_DIR).filter((f) => f.endsWith(".md"));
  const jobs = [];
  const skipped = [];

  for (const file of files) {
    const { slug, title, excerpt } = parseDreamFrontmatter(path.join(DREAMS_DIR, file));
    if (!slug) continue;
    if (only && !only.has(slug)) continue;

    const outPath = path.join(OUT_DIR, `${slug}.png`);
    if (!force && fs.existsSync(outPath)) {
      skipped.push(slug);
      continue;
    }

    const subject =
      DREAM_OVERRIDES[slug] ||
      (excerpt
        ? `${title.toLowerCase()} dream — ${excerpt.toLowerCase()}`
        : `${title.toLowerCase()} dream`);

    const prompt = MASTER_PROMPT(subject, model);
    jobs.push({ slug, outPath, subject, prompt });
  }

  return { jobs, skipped };
}

async function generateOne(client, job) {
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
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return { ok: false, err: lastErr };
}

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
    console.error("OPENAI_API_KEY is not set.");
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
    console.log(`Failed (${failures.length}): ${failures.join(",")}`);
    console.log(
      `Retry:\n  node scripts/generate-dream-images.mjs --only=${failures.join(",")} --force`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
