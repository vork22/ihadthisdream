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
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
