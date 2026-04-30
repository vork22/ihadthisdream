# Content Roadmap (post-launch expansion)

This file tracks content the SEO plan calls for that has not yet shipped.
The site already has the 24 dream pages, 22 expanded flagship symbol
pages, all 163 symbol entries with structured frontmatter, and 16
shipped pillar articles. The remaining items below are the next-best
content investments, in priority order.

---

## Phase 3a: remaining flagship symbols (~140)

The 22 highest-priority flagship symbols are expanded in full. The
remaining ~140 symbol entries have programmatically generated
frontmatter (metaDescription, tldr, citations, journal prompts, FAQs,
date metadata) but the *body* content is still the original short
paragraph.

**Priority queue** (next 30 to expand to 600+ words each):

1. tower
2. cave
3. labyrinth
4. wheel
5. star
6. river
7. forest
8. desert
9. island
10. window
11. clock
12. key
13. mask
14. crown
15. throne
16. king
17. queen
18. mother
19. father
20. trickster
21. hero
22. self
23. persona
24. cross
25. dragon
26. lion
27. wolf
28. bird
29. fish
30. horse

**Method**: use the same template as the existing flagship symbols
(snake, water, fire). About 600 words each, 5 traditions, 4–6 FAQs,
4–6 journal prompts, 3–6 cited primary sources, related symbols and
dreams.

---

## Phase 3c: remaining pillar articles (9)

Sixteen pillar articles are shipped. The remaining nine — at the same
target length (1,500–3,500 words) — are:

1. **dream-symbols-across-cultures** — comparative essay focused on
   specific symbols (water, snake, mother, sun, etc.) across five
   traditions. Big SEO target.
2. **the-self-archetype-and-the-mandala** — Jung's most numinous
   concept, its appearance in dreams, the mandala motif.
3. **the-persona-archetype-and-the-mask** — social mask, role-related
   dreams, the cost of identification with the persona.
4. **the-trickster-archetype-in-dreams** — boundary-crosser, mischief,
   illumination by rule-breaking. Hermes, Coyote, Loki.
5. **the-hero-archetype-in-dreams** — Campbell + Jung CW 5; quest,
   descent, return. Often searched.
6. **the-great-mother-and-her-shadow** — extending the symbol page
   into a full archetypal essay.
7. **the-wise-old-man-and-anima-sapientiae** — extending the symbol
   page; intersects with anima/animus.
8. **dreams-and-creativity** — Coleridge, Kekulé, Mendeleev, Mary
   Shelley; the cross-disciplinary case for incubation.
9. **dreams-and-pregnancy** — physiological + psychological, common
   patterns; complements the dreams/pregnancy entry.

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
