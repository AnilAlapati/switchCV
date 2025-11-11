// Utility functions for generating unique resume slugs

/**
 * Generate a URL-friendly slug from a name
 */
export const generateSlugFromName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .substring(0, 50); // Limit length
};

/**
 * Generate a unique slug with random suffix
 */
export const generateUniqueSlug = (baseName: string): string => {
  const baseSlug = generateSlugFromName(baseName);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
};

/**
 * Generate a short unique ID
 */
export const generateShortId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};
