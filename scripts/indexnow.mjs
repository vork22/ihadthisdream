#!/usr/bin/env node
// Ping IndexNow so Bing/Yandex re-crawl our pages right after each deploy.
// Runs as a postbuild step. Safe to run on every deploy — IndexNow rate-limits
// per host but accepts batches up to 10k URLs.
//
// Usage: `node scripts/indexnow.mjs` (runs automatically via `npm run postbuild`)
//
// If INDEXNOW_KEY is unset, falls back to the key that matches public/<KEY>.txt
// See docs/seo/indexnow-setup.md

import fs from "node:fs";
import path from "node:path";

const HOST = "ihadthisdream.com";
const KEY = process.env.INDEXNOW_KEY ?? "ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITE = `https://${HOST}`;

async function main() {
  const distDir = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distDir)) {
    console.log("[indexnow] no dist/ found, skipping");
    return;
  }

  const urls = collectUrls(distDir, distDir);
  if (urls.length === 0) {
    console.log("[indexnow] no urls collected");
    return;
  }

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    console.log(`[indexnow] submitted ${urls.length} urls — status ${res.status}`);
  } catch (err) {
    console.warn("[indexnow] submission failed:", err);
  }
}

function collectUrls(root, dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectUrls(root, abs));
    } else if (entry.name === "index.html") {
      const rel = path.relative(root, dir);
      const route = "/" + rel.split(path.sep).join("/");
      // Skip QC + API routes and the OG endpoint.
      if (
        route.includes("/symbols-compare") ||
        route.includes("/api/") ||
        route.includes("/og/")
      ) {
        continue;
      }
      const trail = route === "/" ? "/" : `${route}/`;
      out.push(`${SITE}${trail}`);
    }
  }
  return out;
}

main();
