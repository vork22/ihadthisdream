# I Had This Dream — ihadthisdream.com

A scholarly, warm dream-interpretation site. Astro 5 + React 18 islands + Tailwind 4, deployed to Vercel.

## Stack

- **Astro 5** (static pages + content collections)
- **React 18** islands: `DreamChat`, `JournalPane`
- **Tailwind 4** via `@tailwindcss/vite` (tokens in `src/styles/globals.css` `@theme`)
- **Vercel adapter** for the `/api/interpret` serverless function
- **Anthropic SDK** with `claude-haiku-4-5`
- **Sitemap integration** (`@astrojs/sitemap`)

## Local dev

```bash
npm install
cp .env.example .env   # then paste your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:4321.

## Project layout

```
src/
  pages/
    index.astro                       # landing: hero + chat + common dreams + symbols + journal + FAQ
    dreams/[slug].astro               # SSG one page per common dream
    symbols/index.astro               # A–Z dictionary with search/filter
    symbols/[letter]/[slug].astro     # SSG one page per symbol
    api/interpret.ts                  # Anthropic proxy
  components/
    DreamChat.tsx                     # React island — hydrates on client:visible
    JournalPane.tsx                   # React island — client:only (localStorage)
    SiteNav.astro, SiteFooter.astro
    Tweaks.astro                      # theme + font switcher (vanilla JS)
    FAQ.astro                         # accordion with FAQPage JSON-LD
  content/
    symbols/*.md                      # 163 symbol entries
    dreams/*.md                       # 24 common dream entries
  layouts/Base.astro                  # SEO, OG, JSON-LD, fonts
  styles/globals.css                  # tokens + component CSS
public/
  assets/hero-woodcut.png
  favicon.svg, robots.txt
scripts/
  convert-content.mjs                 # regenerate markdown from design bundle
```

## Content updates

Symbol and dream markdown files in `src/content/` are generated from the design
bundle at `../ihadthisdream-design/`. To regenerate:

```bash
node scripts/convert-content.mjs
```

## Deploy

1. Push to GitHub (`vork22/ihadthisdream`)
2. In Vercel, import the repo — framework auto-detects as Astro
3. Add env var: `ANTHROPIC_API_KEY` (production + preview)
4. Point `ihadthisdream.com` at Vercel (A → 76.76.21.21, CNAME www → cname.vercel-dns.com)
