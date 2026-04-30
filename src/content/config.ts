import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const faqItem = z.object({
  q: z.string(),
  a: z.string(),
});

const symbols = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/symbols" }),
  schema: z.object({
    term: z.string(),
    letter: z.string().length(1),
    gloss: z.string(),
    themes: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    traditions: z.array(z.string()).default([]),
    image: z.string().optional(),

    // SEO + structured-content fields. All optional so existing entries don't
    // break; new/expanded entries should fill them in.
    metaDescription: z.string().optional(),
    tldr: z.string().optional(),
    citations: z.array(z.string()).default([]),
    journalPrompts: z.array(z.string()).default([]),
    faqs: z.array(faqItem).default([]),
    datePublished: z.string().optional(),
    dateModified: z.string().optional(),
    expanded: z.boolean().default(false),
  }),
});

const dreams = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/dreams" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    etching: z.string().optional(),
    excerpt: z.string(),
    traditions: z.array(z.string()).default([]),
    relatedSymbols: z.array(z.string()).default([]),

    // SEO + structured-content fields.
    metaDescription: z.string().optional(),
    tldr: z.string().optional(),
    citations: z.array(z.string()).default([]),
    journalPrompts: z.array(z.string()).default([]),
    faqs: z.array(faqItem).default([]),
    whenToSeekHelp: z.string().optional(),
    variations: z.array(z.object({ name: z.string(), summary: z.string() })).default([]),
    datePublished: z.string().optional(),
    dateModified: z.string().optional(),
    expanded: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    headline: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    primarySources: z.array(z.string()).default([]),
    citations: z.array(z.string()).default([]),
    faqs: z.array(faqItem).default([]),
    relatedSymbols: z.array(z.string()).default([]),
    relatedDreams: z.array(z.string()).default([]),
    relatedArticles: z.array(z.string()).default([]),
    datePublished: z.string(),
    dateModified: z.string().optional(),
    readingMinutes: z.number().optional(),
    pillar: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const symbolVariations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/symbol-variations" }),
  schema: z.object({
    // The parent symbol's term (e.g. "Snake"). Resolution is case-insensitive
    // against the symbols collection's term field.
    parentSymbol: z.string(),
    // The variation slug used in the URL (e.g. "biting", "in-water").
    slug: z.string(),
    // Human-friendly label used in titles and breadcrumbs (e.g. "Biting",
    // "In Water"). Singular, capitalised.
    label: z.string(),
    // Short gloss for cards and OG description.
    gloss: z.string(),

    metaDescription: z.string().optional(),
    tldr: z.string().optional(),
    citations: z.array(z.string()).default([]),
    journalPrompts: z.array(z.string()).default([]),
    faqs: z.array(faqItem).default([]),
    relatedVariations: z.array(z.string()).default([]),
    datePublished: z.string().optional(),
    dateModified: z.string().optional(),
  }),
});

export const collections = { symbols, dreams, articles, symbolVariations };
