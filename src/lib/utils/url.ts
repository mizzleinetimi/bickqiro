/**
 * URL parsing utilities for Bickqr
 */

/**
 * Parse slug-id format from URL parameter
 * Format: "my-cool-sound-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * Returns { slug, id } or null for invalid format
 */
export function parseSlugId(slugId: string): { slug: string; id: string } | null {
  // UUID format: 8-4-4-4-12 hex chars with hyphens
  const match = slugId.match(
    /^(.+)-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i
  );
  if (!match) return null;
  return { slug: match[1], id: match[2] };
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Build the full bick URL path
 */
export function buildBickUrl(slug: string, id: string): string {
  return `/bick/${slug}-${id}`;
}

/**
 * Build the canonical URL for a bick
 */
export function buildCanonicalUrl(slug: string, id: string, baseUrl: string = 'https://bickqr.com'): string {
  return `${baseUrl}/bick/${slug}-${id}`;
}
