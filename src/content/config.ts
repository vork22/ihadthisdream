import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
  }),
});

export const collections = { symbols, dreams };
