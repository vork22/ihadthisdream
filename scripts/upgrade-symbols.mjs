#!/usr/bin/env node
// One-shot upgrade pass for symbol markdown files.
//
// For each symbols/*.md that does NOT yet have `expanded: true`, this
// script:
//   - parses frontmatter + body
//   - generates a metaDescription, tldr, journalPrompts, faqs, citations
//     using sensible templates derived from the existing fields
//   - rewrites the file with the new frontmatter while preserving the
//     existing body
//
// Run manually:  node scripts/upgrade-symbols.mjs
// Re-runnable:   skips files already marked expanded.
//
// This is a pragmatic intermediate step — the goal is to ship structured
// stubs that already carry the schema (TL;DR, FAQs, prompts, citations)
// across all 163 symbols, so that the page templates can render the
// full UI pattern. Hand-written long-form content can then replace the
// templated output one entry at a time.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYMBOLS_DIR = join(__dirname, "..", "src", "content", "symbols");

const DEFAULT_CITATIONS = [
  "jung_cw_9i",
  "jung_cw_5",
  "artemidorus_oneirocritica",
];

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw, raw: "" };
  const block = m[1];
  const body = m[2];

  const data = {};
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    let val = kv[2];
    if (val === "" && lines[i + 1] && /^\s+-/.test(lines[i + 1])) {
      const items = [];
      i++;
      while (i < lines.length && /^\s+-/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s*/, "").replace(/^["']|["']$/g, ""));
        i++;
      }
      data[key] = items;
      continue;
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
    i++;
  }
  return { frontmatter: data, body, raw };
}

function emitKey(key, v, lines) {
  if (Array.isArray(v)) {
    if (v.length === 0) {
      lines.push(`${key}: []`);
      return;
    }
    lines.push(`${key}:`);
    for (const x of v) {
      lines.push(`  - ${JSON.stringify(x)}`);
    }
    return;
  }
  if (typeof v === "boolean") {
    lines.push(`${key}: ${v ? "true" : "false"}`);
    return;
  }
  if (typeof v === "number") {
    lines.push(`${key}: ${v}`);
    return;
  }
  if (typeof v === "string") {
    lines.push(`${key}: ${JSON.stringify(v)}`);
    return;
  }
  lines.push(`${key}: ${JSON.stringify(v)}`);
}

function stringifyFrontmatter(data) {
  const order = [
    "term",
    "letter",
    "gloss",
    "themes",
    "related",
    "traditions",
    "image",
    "etching",
    "metaDescription",
    "tldr",
    "citations",
    "journalPrompts",
    "faqs",
    "datePublished",
    "dateModified",
    "expanded",
  ];
  const seen = new Set();
  const lines = ["---"];
  for (const key of order) {
    if (key in data) {
      seen.add(key);
      const v = data[key];
      if (key === "faqs" && Array.isArray(v) && v.length > 0) {
        lines.push("faqs:");
        for (const item of v) {
          lines.push(`  - q: ${JSON.stringify(item.q ?? "")}`);
          lines.push(`    a: ${JSON.stringify(item.a ?? "")}`);
        }
        continue;
      }
      emitKey(key, v, lines);
    }
  }
  for (const [k, v] of Object.entries(data)) {
    if (seen.has(k)) continue;
    emitKey(k, v, lines);
  }
  lines.push("---");
  return lines.join("\n");
}

function buildMetaDescription(term, gloss, traditions) {
  const tradStr =
    Array.isArray(traditions) && traditions.length > 0
      ? traditions.slice(0, 3).join(", ")
      : "Jungian, Freudian, and folk";
  const base = `${term} in dreams: meaning across ${tradStr} traditions. ${gloss} Cited primary sources.`;
  if (base.length <= 160) return base;
  // Trim to last whole word that fits in 158 chars + ellipsis-equivalent period.
  const trimmed = base.slice(0, 157).replace(/\s+\S*$/, "");
  return `${trimmed}.`;
}

function buildTldr(term, gloss, traditions) {
  const tradList =
    Array.isArray(traditions) && traditions.length > 0
      ? traditions.slice(0, 3).join(", ")
      : "depth-psychological";
  return `The ${term.toLowerCase()} is read across ${tradList} traditions as a dream-symbol whose specific meaning depends on the dream's emotional tone, the symbol's behavior in the dream, and the dreamer's own associations. ${gloss}`;
}

function buildJournalPrompts(term, gloss) {
  const lower = term.toLowerCase();
  return [
    `What was the ${lower} doing in your dream?`,
    `How did you feel in its presence — drawn, repelled, indifferent, awed?`,
    `Was the ${lower} familiar from waking life, or unfamiliar?`,
    `What in your waking life right now resembles the quality the ${lower} carries?`,
    `If the ${lower} could speak, what would it say to you?`,
  ];
}

function buildFaqs(term, gloss, traditions) {
  const lower = term.toLowerCase();
  const tradPrimary = (traditions && traditions[0]) || "Jungian";
  const tradList = (traditions ?? ["depth-psychological"]).join(", ");
  return [
    {
      q: `What does it mean to dream of a ${lower}?`,
      a: `Across the depth-psychological tradition, dream-${lower}s carry the meaning suggested by the dreamer's emotional response and the symbol's behavior in the dream. ${gloss}`,
    },
    {
      q: `Is the ${lower} a positive or negative symbol in dreams?`,
      a: `Most dream-symbols are not intrinsically positive or negative; they take their valence from the dreamer's relationship to them in the dream. The ${lower} is no exception — its specific weight depends on context, emotional tone, and the dreamer's associations.`,
    },
    {
      q: `How do ${tradPrimary} and other traditions read the ${lower}?`,
      a: `${tradPrimary} dream-interpretation places the ${lower} within the broader ${tradList} reading of the dream-life. See the page body and bibliography for the specific primary sources cited.`,
    },
    {
      q: `What if the ${lower} keeps recurring in my dreams?`,
      a: `Recurrent dream-symbols generally point to material the conscious self has not yet fully integrated. The recurrence usually softens once the underlying material has been allowed expression — sometimes through journaling, sometimes through therapy, sometimes simply through more careful attention to the symbol on its own terms.`,
    },
  ];
}

function upgradeFile(path) {
  const raw = readFileSync(path, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);

  if (frontmatter.expanded === true || frontmatter.expanded === "true") {
    return { path, skipped: true, reason: "already expanded" };
  }

  const term = frontmatter.term;
  const gloss = frontmatter.gloss ?? "";
  const traditions = Array.isArray(frontmatter.traditions)
    ? frontmatter.traditions
    : [];

  if (!term) {
    return { path, skipped: true, reason: "no term" };
  }

  // Always regenerate templated fields when expanded !== true. Hand-
  // expanded entries are protected by the `expanded: true` flag at the top
  // of this function.
  const upgraded = {
    ...frontmatter,
    metaDescription: buildMetaDescription(term, gloss, traditions),
    tldr: buildTldr(term, gloss, traditions),
    citations:
      Array.isArray(frontmatter.citations) && frontmatter.citations.length > 0
        ? frontmatter.citations
        : DEFAULT_CITATIONS,
    journalPrompts: buildJournalPrompts(term, gloss),
    faqs: buildFaqs(term, gloss, traditions),
    datePublished: frontmatter.datePublished ?? "2025-04-01",
    dateModified: frontmatter.dateModified ?? "2025-04-25",
    expanded: false,
  };

  const out = `${stringifyFrontmatter(upgraded)}\n${body}`;
  writeFileSync(path, out);
  return { path, upgraded: true };
}

const files = readdirSync(SYMBOLS_DIR).filter((f) => f.endsWith(".md"));
const results = files.map((f) => upgradeFile(join(SYMBOLS_DIR, f)));
const upgraded = results.filter((r) => r.upgraded).length;
const skipped = results.filter((r) => r.skipped).length;
console.log(`Upgraded ${upgraded} symbols, skipped ${skipped}.`);
