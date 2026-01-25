/**
 * Slug generation utility for Bickqr
 * 
 * Generates URL-friendly slugs from titles for bick URLs.
 * 
 * Requirements:
 * - 7.3: Generate URL-friendly slug from title
 */

/**
 * Generates a URL-safe slug from a title string.
 * 
 * The slug will:
 * - Be lowercase
 * - Contain only letters, numbers, and hyphens
 * - Have no leading or trailing hyphens
 * - Have no consecutive hyphens
 * - Be non-empty (falls back to 'untitled' for empty/whitespace-only input)
 * 
 * @param title - The title to convert to a slug
 * @returns A URL-safe slug string
 * 
 * **Validates: Requirements 7.3**
 */
export function generateSlug(title: string): string {
  if (typeof title !== 'string') {
    return 'untitled';
  }

  // Normalize unicode characters (NFD decomposition)
  // This separates accented characters into base + combining marks
  let slug = title.normalize('NFD');
  
  // Remove combining diacritical marks (accents)
  slug = slug.replace(/[\u0300-\u036f]/g, '');
  
  // Convert to lowercase
  slug = slug.toLowerCase();
  
  // Replace common unicode characters with ASCII equivalents
  slug = slug
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
    .replace(/ð/g, 'd')
    .replace(/þ/g, 'th');
  
  // Replace any non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  
  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Collapse multiple consecutive hyphens into one
  slug = slug.replace(/-+/g, '-');
  
  // If the result is empty, return a default slug
  if (slug.length === 0) {
    return 'untitled';
  }
  
  return slug;
}

/**
 * Generates a unique slug by appending a random suffix.
 * 
 * This is useful when you need to ensure uniqueness in the database.
 * 
 * @param title - The title to convert to a slug
 * @param suffixLength - Length of the random suffix (default: 6)
 * @returns A URL-safe slug with a random suffix
 */
export function generateUniqueSlug(title: string, suffixLength: number = 6): string {
  const baseSlug = generateSlug(title);
  const suffix = generateRandomSuffix(suffixLength);
  return `${baseSlug}-${suffix}`;
}

/**
 * Generates a random alphanumeric suffix.
 * 
 * @param length - Length of the suffix
 * @returns A random alphanumeric string
 */
function generateRandomSuffix(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates that a string is a valid slug format.
 * 
 * @param slug - The string to validate
 * @returns true if the string is a valid slug
 */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== 'string' || slug.length === 0) {
    return false;
  }
  
  // Must match: lowercase letters, numbers, and hyphens only
  // No leading/trailing hyphens, no consecutive hyphens
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
