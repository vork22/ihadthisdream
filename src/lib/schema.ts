// Schema.org JSON-LD builders. One place for every structured-data shape we
// emit so the wire format stays consistent across page templates.

import { SITE, absUrl } from "./site";
import { resolveSources, sourceToSchema, type PrimarySource } from "./sources";

const ORG = {
  "@type": "Organization",
  "@id": `${SITE.url}/#org`,
  name: SITE.organization.name,
  url: SITE.organization.url,
  logo: SITE.organization.logo,
};

const PUBLISHER = {
  "@type": "Organization",
  name: SITE.organization.name,
  logo: { "@type": "ImageObject", url: SITE.organization.logo },
};

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.url),
    })),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
  about?: string[];
  citationIds?: string[];
}

export function articleSchema(input: ArticleSchemaInput) {
  const citations = resolveSources(input.citationIds);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: absUrl(input.url),
    url: absUrl(input.url),
    image: input.image ? absUrl(input.image) : absUrl(SITE.defaultOgImage),
    datePublished: input.datePublished ?? SITE.publicLaunch,
    dateModified: input.dateModified ?? input.datePublished ?? SITE.publicLaunch,
    inLanguage: SITE.language,
    author: ORG,
    publisher: PUBLISHER,
    isAccessibleForFree: true,
    license: `${SITE.url}/about#attribution`,
    articleSection: input.articleSection,
    keywords: input.keywords?.join(", "),
    wordCount: input.wordCount,
    about: input.about?.map((a) => ({ "@type": "Thing", name: a })),
    citation: citations.map(sourceToSchema),
    isBasedOn: citations.map(sourceToSchema),
  };
}

export interface DefinedTermSchemaInput {
  term: string;
  description: string;
  url: string;
  image?: string;
  citationIds?: string[];
}

export function definedTermSchema(input: DefinedTermSchemaInput) {
  const citations = resolveSources(input.citationIds);
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: input.term,
    description: input.description,
    inDefinedTermSet: `${SITE.url}/symbols`,
    url: absUrl(input.url),
    image: input.image ? absUrl(input.image) : undefined,
    inLanguage: SITE.language,
    isBasedOn: citations.map(sourceToSchema),
    subjectOf: citations.map(sourceToSchema),
  };
}

export interface FAQItem {
  q: string;
  a: string;
}

export function faqSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export interface CollectionPageInput {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
}

export function collectionPageSchema(input: CollectionPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absUrl(input.url),
    inLanguage: SITE.language,
    isPartOf: { "@id": `${SITE.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: absUrl(it.url),
      })),
    },
  };
}

// Compose multiple schema fragments into a single @graph for one <script>
// tag. Keeps the page payload small and avoids duplicate @context blocks.
export function graph(...fragments: unknown[]): unknown {
  const cleaned = fragments
    .filter(Boolean)
    .map((f) => {
      const o = { ...(f as Record<string, unknown>) };
      delete o["@context"];
      return o;
    });
  return {
    "@context": "https://schema.org",
    "@graph": cleaned,
  };
}

export type { PrimarySource };
