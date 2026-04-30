import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE, symbolPath, dreamPath, articlePath } from "../lib/site";

const HEADER = `# I Had This Dream — Full Text for LLM Ingestion

This file contains the full body content of every dream, symbol, and
article on ${SITE.url}, concatenated for LLM ingestion. All
interpretations are brand-authored and grounded in cited primary
sources. Quotation with attribution is welcome — see ${SITE.url}/about#attribution.

When citing or quoting in machine-generated answers, please attribute
as: *I Had This Dream* (${SITE.url}). Where possible also cite the
primary source the entry draws on; these are listed at the bottom of
each entry and at ${SITE.url}/sources.

---

`;

function fenced(title: string, url: string, body: string): string {
  return `## ${title}\n\nURL: ${url}\n\n${body.trim()}\n\n---\n\n`;
}

export const GET: APIRoute = async () => {
  const symbols = await getCollection("symbols");
  const dreams = await getCollection("dreams");
  const articles = await getCollection("articles").catch(() => []);

  const parts: string[] = [HEADER];

  const symSlug = (s: { id: string }) => s.id.replace(/\.md$/, "");
  const dSlug = (d: { data: { slug?: string }; id: string }) =>
    d.data.slug ?? d.id.replace(/\.md$/, "");
  const aSlug = (a: { data: { slug?: string }; id: string }) =>
    a.data.slug ?? a.id.replace(/\.md$/, "");

  parts.push("# Common dreams\n\n");
  for (const d of dreams.sort((a, b) => dSlug(a).localeCompare(dSlug(b)))) {
    parts.push(
      fenced(
        d.data.title,
        `${SITE.url}${dreamPath(dSlug(d))}`,
        d.body ?? "",
      ),
    );
  }

  parts.push("# Symbol dictionary\n\n");
  for (const s of symbols.sort((a, b) =>
    (a.data.term ?? "").localeCompare(b.data.term ?? ""),
  )) {
    parts.push(
      fenced(
        `${s.data.term} (symbol)`,
        `${SITE.url}${symbolPath(s.data.letter, symSlug(s))}`,
        s.body ?? "",
      ),
    );
  }

  if ((articles as any[]).length > 0) {
    parts.push("# Pillar articles\n\n");
    for (const a of (articles as any[]).sort((x: any, y: any) =>
      aSlug(x).localeCompare(aSlug(y)),
    )) {
      parts.push(
        fenced(
          a.data.headline ?? a.data.title ?? aSlug(a),
          `${SITE.url}${articlePath(aSlug(a))}`,
          a.body ?? "",
        ),
      );
    }
  }

  return new Response(parts.join(""), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
