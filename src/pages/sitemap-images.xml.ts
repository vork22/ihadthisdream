// Image sitemap for Google Images. Lists every symbol illustration on its
// canonical page so the woodcuts can earn their own ranking + traffic.

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { absUrl, symbolPath, dreamPath } from "~/lib/site";

export const GET: APIRoute = async () => {
  const symbols = await getCollection("symbols");
  const dreams = await getCollection("dreams");

  const xmlParts: string[] = [];
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  );

  for (const s of symbols) {
    if (!s.data.image) continue;
    const slug = s.id.replace(/\.md$/, "");
    const url = absUrl(symbolPath(s.data.letter, slug));
    const imageUrl = absUrl(s.data.image);
    xmlParts.push("  <url>");
    xmlParts.push(`    <loc>${escape(url)}</loc>`);
    xmlParts.push("    <image:image>");
    xmlParts.push(`      <image:loc>${escape(imageUrl)}</image:loc>`);
    xmlParts.push(
      `      <image:title>${escape(`${s.data.term} — woodcut illustration`)}</image:title>`,
    );
    xmlParts.push(
      `      <image:caption>${escape(s.data.gloss)}</image:caption>`,
    );
    xmlParts.push("    </image:image>");
    xmlParts.push("  </url>");
  }

  for (const d of dreams) {
    if (!d.data.etching) continue;
    const url = absUrl(dreamPath(d.data.slug));
    const imageUrl = absUrl(d.data.etching);
    xmlParts.push("  <url>");
    xmlParts.push(`    <loc>${escape(url)}</loc>`);
    xmlParts.push("    <image:image>");
    xmlParts.push(`      <image:loc>${escape(imageUrl)}</image:loc>`);
    xmlParts.push(
      `      <image:title>${escape(`${d.data.title} — woodcut illustration`)}</image:title>`,
    );
    xmlParts.push(
      `      <image:caption>${escape(d.data.excerpt)}</image:caption>`,
    );
    xmlParts.push("    </image:image>");
    xmlParts.push("  </url>");
  }

  xmlParts.push("</urlset>");

  return new Response(xmlParts.join("\n"), {
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
