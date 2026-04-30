// RSS feed for the Articles hub. RSS still drives discovery via Feedly,
// Substack imports, NetNewsWire, and many of the LLM-side ingest pipelines
// (e.g. Diffbot, Common Crawl).

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { absUrl, articlePath, SITE } from "~/lib/site";

export const GET: APIRoute = async () => {
  const articles = await getCollection("articles");
  articles.sort(
    (a, b) =>
      new Date(b.data.datePublished).getTime() -
      new Date(a.data.datePublished).getTime(),
  );

  const items = articles
    .map((a) => {
      const url = absUrl(articlePath(a.data.slug));
      const pubDate = new Date(a.data.datePublished).toUTCString();
      return `    <item>
      <title>${escape(a.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escape(a.data.description)}</description>
      ${a.data.tags
        .map((t) => `<category>${escape(t)}</category>`)
        .join("\n      ")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(SITE.name)} — Articles</title>
    <link>${SITE.url}/articles</link>
    <atom:link href="${SITE.url}/articles/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escape(SITE.description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
