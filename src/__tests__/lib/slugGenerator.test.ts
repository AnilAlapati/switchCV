// src/__tests__/lib/slugGenerator.test.ts
import {
  generateSlugFromName,
  generateUniqueSlug,
  generateShortId,
} from "@/lib/slugGenerator";

describe("Slug Generator", () => {
  test("should generate slug from name", () => {
    const result = generateSlugFromName("Hello World");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });

  test("should convert to lowercase", () => {
    const result = generateSlugFromName("UPPERCASE");
    expect(result).toBe("uppercase");
  });

  test("should replace spaces with hyphens", () => {
    const result = generateSlugFromName("hello world test");
    expect(result).toBe("hello-world-test");
  });

  test("should remove special characters", () => {
    const result = generateSlugFromName("hello@world#test!");
    expect(/[!@#$%^&*()]/g.test(result)).toBe(false);
  });

  test("should limit length to 50 characters", () => {
    const longName = "a".repeat(100);
    const result = generateSlugFromName(longName);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  test("should generate unique slug with random suffix", () => {
    const result1 = generateUniqueSlug("test");
    const result2 = generateUniqueSlug("test");
    expect(result1).not.toBe(result2);
  });

  test("should generate short ID", () => {
    const result = generateShortId();
    expect(result.length > 0).toBe(true);
  });
});
