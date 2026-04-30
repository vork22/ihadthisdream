/**
 * Common-dream woodcuts live at /assets/dreams/{slug}.png (1024², cream field —
 * generated via scripts/generate-dream-images.mjs). Override with frontmatter `etching`
 * for a custom path when needed.
 */
export function resolveDreamEtching(
  slug: string,
  explicit?: string | null,
): string | undefined {
  const fromFrontmatter = explicit?.trim();
  if (fromFrontmatter) return fromFrontmatter;
  return `/assets/dreams/${slug}.png`;
}
