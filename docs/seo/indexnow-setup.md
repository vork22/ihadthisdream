# IndexNow setup (what is already done vs. what you do)

[IndexNow](https://www.indexnow.org/) tells participating search engines (notably **Bing**) that specific URLs changed so they can crawl them sooner than waiting for the next scheduled crawl.

There is **no separate signup** at “indexnow.org”. You prove domain ownership by hosting a key file and submitting URLs via API — both are already wired in this repo.

---

## Already implemented in code (nothing to install)

| Piece | Location | Purpose |
|--------|-----------|--------|
| **Key file** | [`public/ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c.txt`](../../public/ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c.txt) | Served at production as `https://ihadthisdream.com/<KEY>.txt` so APIs can verify you control the host. |
| **Ping script** | [`scripts/indexnow.mjs`](../../scripts/indexnow.mjs) | After build, collects every HTML route from `dist/` and POSTs them to the IndexNow API. |
| **Build hook** | [`package.json`](../../package.json) `postbuild` | Runs the script after `astro build` on every deploy (`node scripts/indexnow.mjs || true`). |
| **Default key** | Same string as the filename **without** `.txt` | The script uses `process.env.INDEXNOW_KEY` or falls back to the committed key so deploys ping even before you add env vars. |

---

## What you actually do

### 1. Deploy to production

The key file must be **live on HTTPS** under your domain. Open this in a browser after deploy:

`https://ihadthisdream.com/ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c.txt`

You should see **one line of text**: the raw key (`ihtd-2c4f8…`), matching the IndexNow rules.

Until this URL resolves, Bing cannot validate your submissions.

---

### 2. (Recommended) Set `INDEXNOW_KEY` on Vercel

**Settings → Environment Variables:**

- **Name:** `INDEXNOW_KEY`
- **Value:** `ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c`  
  (must match `.env.example` — the filename in `public/` **without** `.txt`)

This is optional only because the script hardcodes the same default; setting it in Vercel documents intent and makes future key rotation easier without editing JS.

---

### 3. Confirm the ping after a deploy

**Vercel → Deployments → select a deployment → Building / Logs.**

Look for:

`[indexnow] submitted <N> urls — status 200`

- **200** (or sometimes **202** depending on gateway): submission accepted.
- **Network/DNS failures** in sandboxed or offline builds are harmless; production on Vercel has outbound DNS.

---

### 4. Bing Webmaster Tools (reporting — not required for the API)

1. Verify `ihadthisdream.com` at [Bing Webmaster Tools](https://www.bing.com/webmasters) (import from Google Search Console if you want it fast).
2. Submit **`https://ihadthisdream.com/sitemap-index.xml`**.
3. After some deploys, check **Indexing → IndexNow** (wording varies) for submission activity.

Google Search Console does **not** use IndexNow the same way; keep using **sitemaps** for Google.

---

## What IndexNow does *not* do

- Does **not** guarantee indexing or ranking.
- Does **not** replace sitemaps; use both.
- Does **not** require a monthly fee or a separate “IndexNow account” dashboard.

---

## Manual test (optional)

```bash
npm run build
npm run indexnow
```

Requires network access so `fetch` reaches `api.indexnow.org`.
