# Indexing & Measurement Playbook (Phase 6)

This playbook covers how `ihadthisdream.com` gets indexed, how we
measure performance, and how we keep content fresh. It is the
operations counterpart to the `backlinks-playbook.md`.

---

## 1. Initial indexing checklist (one-time)

### Google Search Console

1. Verify `ihadthisdream.com` (DNS TXT record).
2. Submit `https://ihadthisdream.com/sitemap-index.xml`.
3. Submit `https://ihadthisdream.com/sitemap-images.xml`.
4. Inspect the homepage and request indexing.
5. Inspect 5 priority URLs (top symbols + top dreams) and request
   indexing manually.

### Bing Webmaster Tools

1. Verify property (use the GSC import flow — fastest).
2. Submit both sitemaps.
3. Confirm IndexNow key file is reachable at:
   `https://ihadthisdream.com/<INDEXNOW_KEY>.txt`
4. The site's `postbuild` hook (`scripts/indexnow.mjs`) pings IndexNow
   automatically on every Vercel deploy. Verify the first ping
   in Bing's IndexNow report after a deploy.

### Yandex Webmaster (optional but cheap)

1. Verify and submit sitemap.
2. Yandex honors IndexNow.

### Apple / DuckDuckGo

- DuckDuckGo crawls Bing; the Bing setup covers it.
- Apple uses Applebot. The robots.txt explicitly allows
  Applebot-Extended.

---

## 2. Continuous indexing (every deploy)

The `postbuild` hook (`scripts/indexnow.mjs`) does the following automatically:

1. Uses `INDEXNOW_KEY` from the environment, or falls back to the Key
   committed beside `public/<KEY>.txt`.
2. Scans **`dist/`** for `index.html` files and derives the public URL for
   each route (same pages users get; excludes `/symbols-compare`, `/api/*`,
   `/og/*`).
3. POSTs `{ host, key, keyLocation, urlList }` to
   `https://api.indexnow.org/IndexNow` once per deploy.

There is **no IndexNow dashboard signup** inside the codebase: proof of
ownership is the key file served at production. Step-by-step for operators:
see [`indexnow-setup.md`](./indexnow-setup.md).

**On Vercel:** set `INDEXNOW_KEY` so it matches `public/<KEY>.txt` (omit
`.txt`). Optional but explicit.

**Verification:** Vercel build log line `[indexnow] submitted … —
status …`; Bing Webmaster Tools → IndexNow reports (after site is verified).

---

## 3. Rank tracking

### Tools (pick one)

- **Ahrefs** — best link data, ~$129/mo. Recommended.
- **Semrush** — best keyword data and competitive analysis, ~$139/mo.
- **Mangools / SE Ranking / Serpstat** — budget options, $50–80/mo.

### Tracked keywords (track 100)

Set up the tracker with these keyword buckets:

1. **Top 30 symbol queries:** `[symbol] dream meaning`,
   `[symbol] dream interpretation`, `[symbol] in dreams`.
2. **Top 24 common-dream queries:** `[dream] dream meaning`,
   `dream about [dream]`, `what does [dream] mean`.
3. **Pillar topics:** `jungian dream interpretation`,
   `freudian dream interpretation`, `vedic dream interpretation`,
   `sufi dream interpretation`, `lucid dreaming guide`,
   `recurring dreams meaning`, `nightmare interpretation`,
   `dream journal prompts`.
4. **Brand:** `i had this dream`, `ihadthisdream`,
   `ihadthisdream.com`.
5. **Long-tail variations:** 20 long-tail "[symbol] dream meaning
   [tradition]" pairings to monitor topic-cluster traction.

### Cadence

- **Weekly snapshot** (Mondays): take a CSV export of all 100 ranks.
  Save to `docs/seo/rank-snapshots/YYYY-MM-DD.csv` (don't commit if
  they contain proprietary data — gitignore the directory).
- **Monthly review:** identify keywords on positions 11–30 with
  measurable search volume. These are the *closest wins*. Refresh and
  re-internal-link the corresponding pages.

---

## 4. GA4 dashboard

Set up the following 6 reports as a custom dashboard:

1. **Acquisition / channel** — sessions by channel (organic, direct,
   referral, social), 28-day rolling.
2. **Landing page / organic** — top 50 organic landing pages with
   sessions, engaged sessions, conversion (newsletter signup).
3. **Engagement / page** — top pages by engaged sessions per user.
4. **Conversion / newsletter** — signups by source/medium and landing
   page.
5. **Search Console / queries** (linked from GSC) — top queries by
   clicks and impressions, with average position.
6. **Country and device** — make sure mobile experience is healthy
   (target: bounce-rate parity with desktop).

### Conversion events

In GA4, define the following custom events as conversions:

- `newsletter_signup` (when implemented)
- `journal_export` (when implemented)
- `outbound_source_click` (clicks on /sources citations)
- `scroll_75` (75% scroll depth on dream/symbol pages — built-in)

---

## 5. Microsoft Clarity heatmaps

Once Clarity has 7 days of data:

1. Look at the **scroll-depth heatmap** of the top 5 pages.
   - If users drop off before the FAQ, raise the FAQ.
2. Look at the **rage-click report** weekly.
3. Look at the **dead-click report** monthly. Many "dead clicks" are a
   sign that users expect interactivity that isn't there — sometimes
   that's a feature request, sometimes a UX fix.
4. Watch 3 session recordings per week. Pick the longest sessions on
   the highest-traffic pages.

---

## 6. Quarterly content refresh

Every 90 days, run this **5-step refresh** on the top 20 pages by
organic impressions (not clicks):

1. **Update `dateModified`** in the frontmatter.
2. **Add 200–400 fresh words** addressing a question pulled from GSC's
   "queries" report that the page doesn't yet answer well.
3. **Add 1–2 new internal links** from the page to relevant
   newer pages, and from at least one existing page *to* this page.
4. **Add 1 new primary-source citation** — and cite a passage that's
   genuinely on-topic, not boilerplate.
5. **Optionally rotate the OG image** if click-through-rate (in GSC)
   is below 1% for that page's queries.

After each refresh, *manually request indexing* in GSC for that URL
and run an IndexNow ping (the next deploy does this automatically).

---

## 7. Title and meta A/B rewrites

Every 6 weeks, rewrite the `title` and `metaDescription` of:

- The 10 pages with **highest impressions** but **CTR < 1.5%**.
- The 10 pages on **page 2** (positions 11–20) of any tracked keyword.

Rules:

- Keep the brand suffix `| I Had This Dream` consistent.
- Vary the angle: question → benefit → number → tradition.
- Test for 2 weeks, then keep the winner. Track the experiment in
  `docs/seo/title-tests.csv`.

### Title test log schema

`docs/seo/title-tests.csv`:

```
test_start,test_end,url,old_title,old_ctr,new_title,new_ctr,delta,kept
```

---

## 8. Core Web Vitals monitoring

GSC's Page Experience report is the source of truth. Targets:

- **LCP** ≤ 2.5s (95th percentile, mobile)
- **INP** ≤ 200ms
- **CLS** ≤ 0.1

Monthly: confirm 95% of indexed URLs are in the "Good" bucket.

If a page falls out:

1. Run PageSpeed Insights and Lighthouse in incognito.
2. Check for image regressions, third-party scripts, or new heavy
   components.
3. Roll back or fix within 7 days.

---

## 9. Key dashboards (single-pane-of-glass)

Create a Google Sheet `seo-cockpit.gsheet` (or Notion page) with these
tabs:

1. **Overview** — month-over-month: organic sessions, indexed pages,
   referring domains, branded search volume, top 5 keywords.
2. **Indexing** — submitted, indexed, excluded (with reasons).
3. **Backlinks** — DR distribution histogram, top 20 referring domains.
4. **Rankings** — sparkline per tracked keyword.
5. **Content refresh queue** — next 20 URLs to refresh (auto-sorted by
   impressions × (1 - CTR)).
6. **Title-test queue** — next 20 URLs to A/B-test titles on.

---

## 10. North-star metric

The single number that matters:

> **Monthly organic sessions to dream/symbol pages from non-brand
> queries**, with engaged session rate ≥ 50%.

Year-one milestones:

- **Month 3:** 1,000 sessions/mo
- **Month 6:** 5,000 sessions/mo
- **Month 9:** 15,000 sessions/mo
- **Month 12:** 40,000–60,000 sessions/mo
- **Month 18:** 120,000+ sessions/mo

These targets assume Phases 0–4 are shipped (they are), and Phases 5–6
are run *consistently*. Consistency beats intensity here.
