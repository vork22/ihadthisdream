import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://ihadthisdream.com",
  output: "static",
  adapter: vercel({
    // /api/visualize loads scripts/style-anchor.png at runtime via fs.readFileSync.
    // Vercel's bundler doesn't trace files outside src/ + public/, so we have to
    // explicitly opt the anchor PNG into the function bundle. Without this, the
    // function 502s after the rate-limit counter increments and dreams render no
    // image.
    includeFiles: ["./scripts/style-anchor.png"],
  }),
  integrations: [
    react(),
    sitemap({
      // Internal QC and the server endpoints stay out of the index.
      filter: (page) =>
        !page.includes("/symbols-compare") &&
        !page.includes("/api/") &&
        !page.includes("/og/"),
      // Per-route priorities tell Google which pages we consider primary.
      // Defaults to 0.7 for everything else.
      serialize(item) {
        const url = item.url;
        let priority = 0.7;
        let changefreq = "monthly";

        if (url === "https://ihadthisdream.com/") {
          priority = 1.0;
          changefreq = "weekly";
        } else if (url.includes("/articles/")) {
          priority = url.endsWith("/articles/") ? 0.9 : 0.9;
          changefreq = "weekly";
        } else if (url.includes("/dreams/")) {
          priority = url.endsWith("/dreams/") ? 0.9 : 0.8;
          changefreq = "monthly";
        } else if (url.includes("/symbols/")) {
          priority = url.endsWith("/symbols/") ? 0.9 : 0.8;
          changefreq = "monthly";
        } else if (url.includes("/tags/")) {
          priority = 0.6;
        } else if (
          /\/(about|methodology|sources|privacy|terms|contact)\/?$/.test(url)
        ) {
          priority = 0.5;
          changefreq = "yearly";
        }

        return { ...item, priority, changefreq };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
