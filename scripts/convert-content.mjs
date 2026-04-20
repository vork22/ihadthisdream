#!/usr/bin/env node
/**
 * Converts the design bundle's JS content (symbols + common dreams)
 * into Astro Content Collection markdown under src/content/.
 *
 * Source: ../design_handoff_ihadthisdream/project/{content,data}/*.js
 *         (env DESIGN_ROOT overrides — useful when the design bundle
 *          lives somewhere else on disk.)
 * Output: src/content/symbols/*.md + src/content/dreams/*.md
 *
 * Run with:  node scripts/convert-content.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const designRoot =
  process.env.DESIGN_ROOT ||
  path.resolve(projectRoot, "..", "design_handoff_ihadthisdream", "project");

if (!fs.existsSync(designRoot)) {
  console.error(
    `Design bundle not found at ${designRoot}. ` +
      `Set DESIGN_ROOT=/absolute/path/to/bundle to override.`,
  );
  process.exit(1);
}

function readWindowExport(filename, key) {
  const src = fs.readFileSync(path.join(designRoot, filename), "utf8");
  // Evaluate in a fake "window" context. The files each assign to window.KEY.
  const sandbox = { window: {} };
  const fn = new Function("window", src);
  fn(sandbox.window);
  if (!Array.isArray(sandbox.window[key])) {
    throw new Error(`Expected window.${key} to be an array in ${filename}`);
  }
  return sandbox.window[key];
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function yamlList(arr) {
  if (!arr || arr.length === 0) return "[]";
  return "[" + arr.map((x) => JSON.stringify(x)).join(", ") + "]";
}

function escapeYamlString(s) {
  // Double-quoted YAML string: escape backslashes and double-quotes.
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function writeIfChanged(outPath, body) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body);
}

// --- Symbols ---
const symbolSources = [
  ["content/symbols-full.js", "SYMBOLS_FULL"],
  ["content/symbols-batch-2.js", "SYMBOLS_BATCH_2"],
  ["content/symbols-batch-3.js", "SYMBOLS_BATCH_3"],
  ["content/symbols-batch-4.js", "SYMBOLS_BATCH_4"],
  ["content/symbols-batch-5.js", "SYMBOLS_BATCH_5"],
];

const allSymbols = symbolSources.flatMap(([file, key]) => readWindowExport(file, key));

const symbolsDir = path.join(projectRoot, "src", "content", "symbols");
fs.mkdirSync(symbolsDir, { recursive: true });

const seenSlugs = new Set();
for (const s of allSymbols) {
  let slug = slugify(s.term);
  let i = 2;
  while (seenSlugs.has(slug)) slug = `${slugify(s.term)}-${i++}`;
  seenSlugs.add(slug);

  const letter = (s.letter || s.term[0]).toUpperCase();
  const body = (s.entry || "").trim();
  const frontmatter = [
    "---",
    `term: ${escapeYamlString(s.term)}`,
    `letter: ${escapeYamlString(letter)}`,
    `gloss: ${escapeYamlString(s.gloss || "")}`,
    `themes: ${yamlList(s.themes || [])}`,
    `related: ${yamlList(s.related || [])}`,
    `traditions: ${yamlList(s.traditions || [])}`,
    `image: ${escapeYamlString(`/assets/symbols/${slug}.png`)}`,
    "---",
    "",
    body,
    "",
  ].join("\n");

  writeIfChanged(path.join(symbolsDir, `${slug}.md`), frontmatter);
}
console.log(`✓ Symbols: wrote ${seenSlugs.size} files to src/content/symbols/`);

// --- Common dreams ---
// dictionary.js has window.COMMON_DREAMS with { term, one, expanded, themes } shape.
// README mentions richer fields (tradition tags, related symbols) — we derive
// traditions from the expanded text heuristically where possible, otherwise [].
const commonDreamsSrc = fs.readFileSync(
  path.join(designRoot, "data/dictionary.js"),
  "utf8",
);
const dreamSandbox = { window: {} };
new Function("window", commonDreamsSrc)(dreamSandbox.window);
const commonDreams = dreamSandbox.window.COMMON_DREAMS || [];

const dreamsDir = path.join(projectRoot, "src", "content", "dreams");
fs.mkdirSync(dreamsDir, { recursive: true });

const TRADITION_KEYWORDS = [
  ["Freud", /freud/i],
  ["Jung", /jung/i],
  ["Hindu", /hindu|vedic|upanishad|rig veda|nāga|naga/i],
  ["Buddhist", /buddhist|buddha/i],
  ["Indigenous", /indigenous|ojibwe|lakota|cree|anishinaabe|maori|aboriginal/i],
  ["Sufi", /sufi/i],
  ["Celtic", /celtic|avalon/i],
  ["Egyptian", /egyptian|bastet|ba-bird/i],
  ["Chinese", /chinese/i],
  ["Japanese", /japanese|yatsuhashi/i],
  ["Folk", /folk|folk tradition|folklore/i],
  ["Christian", /christian|christianity/i],
];
function inferTraditions(text) {
  const hits = [];
  for (const [name, rx] of TRADITION_KEYWORDS) {
    if (rx.test(text)) hits.push(name);
  }
  return hits;
}

for (const d of commonDreams) {
  const slug = slugify(d.term);
  const traditions = inferTraditions(d.expanded || "");
  const frontmatter = [
    "---",
    `title: ${escapeYamlString(d.term)}`,
    `slug: ${escapeYamlString(slug)}`,
    `excerpt: ${escapeYamlString(d.one || "")}`,
    `traditions: ${yamlList(traditions)}`,
    `relatedSymbols: ${yamlList([])}`,
    "---",
    "",
    (d.expanded || "").trim(),
    "",
  ].join("\n");
  writeIfChanged(path.join(dreamsDir, `${slug}.md`), frontmatter);
}
console.log(`✓ Common dreams: wrote ${commonDreams.length} files to src/content/dreams/`);
