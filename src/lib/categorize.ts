import { getCollection } from "astro:content";

type Categorization = {
  symbols: string[];
  commonDreams: string[];
  themes: string[];
  traditions: string[];
  wordCount: number;
};

let CACHE: {
  symbolIndex: Array<{ slug: string; term: string; themes: string[]; traditions: string[] }>;
  dreamIndex: Array<{ slug: string; title: string; aliases: string[]; traditions: string[] }>;
} | null = null;

// Hand-tuned aliases to catch phrasings that a plain slug match would miss.
// Keys are dream slugs; values are extra trigger phrases.
const DREAM_ALIASES: Record<string, string[]> = {
  "being-chased": ["chased", "chasing me", "running from", "pursued"],
  "being-late": ["running late", "missed the train", "missed the bus", "missed my flight"],
  "cheating-being-cheated-on": ["cheating", "affair", "cheated on", "infidelity"],
  "dead-loved-one": ["dead father", "dead mother", "dead grandmother", "dead grandfather", "visited by", "my late"],
  "driving-an-out-of-control-car": ["brakes", "out of control car", "no brakes", "can't steer"],
  "exam-unprepared": ["exam", "test i didn't study", "final exam", "unprepared for a test"],
  "falling": ["falling", "fell", "plummet"],
  "finding-money": ["finding money", "found cash", "pile of money"],
  "flying": ["flying", "i could fly", "took flight"],
  "lost-can-t-find-the-way": ["lost", "can't find my way", "couldn't find", "maze"],
  "naked-in-public": ["naked", "no clothes", "undressed in public"],
  "old-house-childhood-home": ["childhood home", "house i grew up in", "old house"],
  "school-old-classroom": ["classroom", "back in school", "high school", "old school"],
  "snake": ["snake", "serpent", "python", "cobra", "viper"],
  "spiders": ["spider", "spiders", "web", "webs"],
  "teeth-falling-out": ["teeth falling out", "my teeth fell", "lost teeth", "teeth crumbling"],
  "fire": ["fire", "flames", "burning", "house on fire"],
  "flood": ["flood", "flooding", "tidal wave"],
  "storm": ["storm", "thunder", "lightning", "hurricane"],
  "water": ["ocean", "river", "drowning", "swimming"],
  "baby": ["baby", "infant", "newborn"],
  "pregnancy": ["pregnant", "pregnancy", "giving birth"],
  "house": ["house", "my house", "rooms i've never seen"],
  "death": ["i died", "dying", "my own death"],
};

async function buildIndex() {
  if (CACHE) return CACHE;

  const [symbols, dreams] = await Promise.all([
    getCollection("symbols"),
    getCollection("dreams"),
  ]);

  const symbolIndex = symbols.map((s) => ({
    slug: s.id,
    term: s.data.term.toLowerCase(),
    themes: s.data.themes ?? [],
    traditions: s.data.traditions ?? [],
  }));

  const dreamIndex = dreams.map((d) => ({
    slug: d.data.slug,
    title: d.data.title.toLowerCase(),
    aliases: [
      d.data.title.toLowerCase(),
      d.data.slug.replace(/-/g, " "),
      ...(DREAM_ALIASES[d.data.slug] ?? []),
    ].map((a) => a.toLowerCase()),
    traditions: d.data.traditions ?? [],
  }));

  CACHE = { symbolIndex, dreamIndex };
  return CACHE;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function categorize(raw: string): Promise<Categorization> {
  const { symbolIndex, dreamIndex } = await buildIndex();
  const text = " " + normalize(raw) + " ";

  const matchedSymbols = new Set<string>();
  const themes = new Set<string>();
  const traditions = new Set<string>();

  for (const s of symbolIndex) {
    // Word-boundary match so "bee" doesn't catch "been".
    if (text.includes(` ${s.term} `) || text.includes(` ${s.term}s `)) {
      matchedSymbols.add(s.term);
      s.themes.forEach((t) => themes.add(t));
      s.traditions.forEach((t) => traditions.add(t));
    }
  }

  const matchedDreams = new Set<string>();
  for (const d of dreamIndex) {
    for (const alias of d.aliases) {
      if (alias.length < 3) continue;
      if (text.includes(` ${alias} `) || text.includes(` ${alias}.`) || text.includes(` ${alias},`)) {
        matchedDreams.add(d.slug);
        d.traditions.forEach((t) => traditions.add(t));
        break;
      }
    }
  }

  return {
    symbols: Array.from(matchedSymbols).sort(),
    commonDreams: Array.from(matchedDreams).sort(),
    themes: Array.from(themes).sort(),
    traditions: Array.from(traditions).sort(),
    wordCount: raw.trim().split(/\s+/).filter(Boolean).length,
  };
}
