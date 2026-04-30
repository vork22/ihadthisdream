# Content Roadmap (post-launch expansion)

This file tracks content the SEO plan calls for that has not yet shipped.
The site already has the 24 dream pages, 23 expanded flagship symbol
pages, all 163 symbol entries with structured frontmatter, and 21 pillar
articles. The remaining items below are the next-best content
investments, in priority order.

---

## Phase 3a: remaining flagship symbols (~140)

The 23 flagship symbols (tower now included among the expanded set) ship long-form bodies; the remaining ~140 symbol entries have programmatically generated
frontmatter (metaDescription, tldr, citations, journal prompts, FAQs,
date metadata) but the *body* content is still the original short
paragraph.

**Priority queue** (next to expand to 600+ words each):

1. cave
2. labyrinth
3. wheel
4. star
5. river
6. forest
7. desert
8. island
9. window
10. clock
11. key
12. mask
13. crown
14. throne
15. king
16. queen
17. mother
18. father
19. trickster
20. hero
21. self
22. persona
23. cross
24. dragon
25. lion
26. wolf
27. bird
28. fish
29. horse

_(Tower completed 2026-04-29.)_

**Method**: use the same template as the existing flagship symbols
(snake, water, fire). About 600 words each, 5 traditions, 4–6 FAQs,
4–6 journal prompts, 3–6 cited primary sources, related symbols and
dreams.

---

## Phase 3c: remaining pillar articles (6)

Twenty-one pillar articles are shipped (**dream-symbols-across-cultures**,
**the-self-archetype-and-the-mandala**, **dreams-and-pregnancy**, and the earlier
pillars listed on `/articles`). The remaining six — same target length
(1,500–3,500 words) — are:

1. **the-persona-archetype-and-the-mask** — social mask, role-related dreams.
2. **the-trickster-archetype-in-dreams** — Hermes, Coyote, Loki; rule-breaking illumination.
3. **the-hero-archetype-in-dreams** — quest, descent, return; Jung CW 5 + Campbell.
4. **the-great-mother-and-her-shadow** — extending the Great Mother symbol page into a pillar.
5. **the-wise-old-man-and-anima-sapientiae** — extending the Wise Old Man symbol arc.
6. **dreams-and-creativity** — Coleridge, Kekulé, incubation vs overclaiming biography.

**Method**: same as shipped pillars. 1,500–3,500 words. Open with a
working definition. Cover the major traditions (when applicable).
Include a method section. End with further reading and a clear FAQ
block.

---

## Phase 3d: long-tail variation pages

The plan calls for 5–10 variation pages per top-30 symbol — 150–300
pages total — at 400+ unique words each.

A *variation page* is a symbol-page intersected with a specific
context. Example URL pattern: `/symbols/s/snake/in-water` or
`/symbols/s/snake/biting`. We have demonstration variations for snake,
water, and fire to establish the routing pattern (see
`src/pages/symbols/[letter]/[slug]/[variation].astro`).

The remaining variations should be added gradually — 4–6 per week — as
search-console data identifies which intersection keywords are
producing impressions.

**Variation matrix** (apply to top 30 symbols):

- Animals: in-water, biting, attacking, dead, baby, golden, white, black, two-headed, swallowing
- Water: rising, dirty, rushing, drowning-in, calm, frozen, walking-on, bathing-in, ocean, well
- Fire: burning-house, can't-extinguish, holding, not-burned-by, spreading, blue-flame, candle, distant
- Falling: from-cliff, from-building, into-water, endless, with-someone, slow, into-bed
- Flying: high, low, with-wings, without-wings, struggling, escaping, peaceful
- Mirror: broken, no-reflection, distorted, multiple, can't-find, talking
- Door: locked, can't-open, behind-wall, multiple, opening, shutting, glass

Build a symbol × variation matrix in a spreadsheet; pick the 5–10
combinations per symbol with highest search volume; write each.

**Method**: 400+ unique words per page. Don't duplicate the parent
symbol page; this is the *intersection*. Lean on cited primary sources
where the source addresses the specific intersection (Jung on snake-
biting, Freud on water-rising, etc.).

---

## Quarterly review

Every 90 days, audit:

1. Which of the above are now shipped.
2. Which planned pages are no longer worth shipping (search demand
   moved on, or the page is covered well enough by an existing one).
3. Which *unplanned* topics emerged from search-console queries with
   impressions but no matching page.

Update this file in place after each review.

---

## Definition of "done" for each entry

A page is shipped-quality when it has:

- Structured frontmatter (metaDescription, tldr, citations, journal
  prompts, FAQs, datePublished, dateModified, expanded: true).
- Body content at the target length for its tier.
- At least 3 cited primary sources from `src/lib/sources.ts`.
- At least 2 internal links to related symbols, dreams, or articles.
- An FAQ block of at least 3 question/answer pairs.

If you ship something that doesn't meet this bar, leave
`expanded: false` and put it on the queue above.
