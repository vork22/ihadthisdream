// Single source of truth for branding, URLs, and shared SEO constants.
// Anything that references "I Had This Dream" or the site URL in user-facing
// copy or schema should pull from here.

export const SITE = {
  url: "https://ihadthisdream.com",
  name: "I Had This Dream",
  tagline: "A scholarly dream interpreter",
  description:
    "A scholarly, warm dream interpreter drawing on Jung, Freud, Vedic, Sufi, and Indigenous traditions. Chat about your dream, browse a sourced A–Z of symbols, and keep a private journal.",
  language: "en-US",
  locale: "en_US",
  twitter: "",
  defaultOgImage: "/assets/hero-woodcut.png",
  organization: {
    name: "I Had This Dream",
    url: "https://ihadthisdream.com",
    logo: "https://ihadthisdream.com/favicon.svg",
  },
  // Used for IndexNow on Bing/Yandex. The corresponding key file is served
  // from /public/<key>.txt and contains exactly the same string.
  indexNowKey: "ihtd-2c4f8a6b9e1d3f5a7b9c0d2e4f6a8b0c",
  publicLaunch: "2025-04-01",
} as const;

// Title format helpers — locked patterns from the SEO plan.
export function symbolTitle(term: string): string {
  return `${term} in Dreams: Meaning & Symbolism (Jungian, Freudian, Vedic) | ${SITE.name}`;
}

export function dreamTitle(title: string): string {
  return `${title} Dream Meaning: What It Symbolizes & Why It Recurs | ${SITE.name}`;
}

export function articleTitle(headline: string): string {
  return `${headline} | ${SITE.name}`;
}

export function pageTitle(label: string): string {
  return `${label} | ${SITE.name}`;
}

// Build an absolute URL for a path. Used everywhere we render canonicals,
// schema URLs, OG urls, sitemaps, llms.txt entries.
export function absUrl(pathname: string): string {
  if (pathname.startsWith("http")) return pathname;
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE.url}${p}`;
}

// Internal slug helpers.
export function symbolPath(letter: string, slug: string): string {
  return `/symbols/${letter.toLowerCase()}/${slug}`;
}

export function dreamPath(slug: string): string {
  return `/dreams/${slug}`;
}

export function articlePath(slug: string): string {
  return `/articles/${slug}`;
}

export function tagPath(tag: string): string {
  return `/tags/${tag.toLowerCase().replace(/\s+/g, "-")}`;
}

export function variationPath(
  letter: string,
  symbolSlug: string,
  variationSlug: string,
): string {
  return `/symbols/${letter.toLowerCase()}/${symbolSlug}/${variationSlug}`;
}

export function variationTitle(symbolTerm: string, variationLabel: string): string {
  return `${symbolTerm} ${variationLabel} in Dreams: Meaning & Interpretation | ${SITE.name}`;
}
