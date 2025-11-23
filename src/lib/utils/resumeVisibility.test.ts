/**
 * Tests for lib/utils/resumeVisibility utilities
 */

import {
  maskEmail,
  maskPhone,
  renderContactField,
  countVisibility,
  filterByVisibility,
  parseEnhancedContent,
  hasRequestItems,
  hasMaskedItems,
  sanitizeResumeForPublicView,
} from "@/lib/utils/resumeVisibility";

describe("resumeVisibility Utilities", () => {
  describe("maskEmail", () => {
    it("should mask email correctly", () => {
      expect(maskEmail("john.doe@example.com")).toBe("j***@example.com");
    });

    it("should handle single character local part", () => {
      expect(maskEmail("a@example.com")).toBe("a***@example.com");
    });

    it("should return original email if no @ symbol", () => {
      expect(maskEmail("invalidemail")).toBe("invalidemail");
    });

    it("should handle plus addressing", () => {
      const masked = maskEmail("user+tag@example.com");
      expect(masked).toContain("***@example.com");
    });
  });

  describe("maskPhone", () => {
    it("should mask phone number keeping last 4 digits", () => {
      expect(maskPhone("555-123-4567")).toBe("***-***-4567");
    });

    it("should handle unformatted phone numbers", () => {
      expect(maskPhone("5551234567")).toBe("***-***-4567");
    });

    it("should handle phone with extensions", () => {
      const masked = maskPhone("555-123-4567 ext 123");
      expect(masked.endsWith("4567")).toBe(true);
    });

    it("should return placeholder for short numbers", () => {
      expect(maskPhone("123")).toBe("***-***-****");
    });

    it("should handle empty string", () => {
      expect(maskPhone("")).toBe("***-***-****");
    });
  });

  describe("renderContactField", () => {
    it("should return value as-is for public visibility", () => {
      const value = "john@example.com";
      expect(renderContactField(value, "public", "email")).toBe(value);
    });

    it("should mask email for masked visibility", () => {
      expect(renderContactField("john@example.com", "masked", "email")).toBe(
        "j***@example.com"
      );
    });

    it("should mask phone for masked visibility", () => {
      expect(renderContactField("555-123-4567", "masked", "phone")).toContain(
        "***-***-4567"
      );
    });

    it("should return request message for request visibility", () => {
      expect(renderContactField("john@example.com", "request", "email")).toBe(
        "Available upon request"
      );
    });

    it("should return request message for request phone visibility", () => {
      expect(renderContactField("555-123-4567", "request", "phone")).toBe(
        "Available upon request"
      );
    });
  });

  describe("countVisibility", () => {
    it("should count visibility levels correctly", () => {
      const items = [
        { visibility: "public" as const },
        { visibility: "public" as const },
        { visibility: "masked" as const },
        { visibility: "request" as const },
      ];

      const counts = countVisibility(items);

      expect(counts.public).toBe(2);
      expect(counts.masked).toBe(1);
      expect(counts.request).toBe(1);
    });

    it("should return zero counts for empty array", () => {
      const counts = countVisibility([]);

      expect(counts.public).toBe(0);
      expect(counts.masked).toBe(0);
      expect(counts.request).toBe(0);
    });

    it("should handle single item", () => {
      const counts = countVisibility([{ visibility: "public" as const }]);

      expect(counts.public).toBe(1);
      expect(counts.masked).toBe(0);
      expect(counts.request).toBe(0);
    });
  });

  describe("filterByVisibility", () => {
    const items = [
      { id: "1", visibility: "public" as const },
      { id: "2", visibility: "masked" as const },
      { id: "3", visibility: "public" as const },
      { id: "4", visibility: "request" as const },
    ];

    it("should filter public items", () => {
      const result = filterByVisibility(items, "public");

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.visibility === "public")).toBe(true);
    });

    it("should filter masked items", () => {
      const result = filterByVisibility(items, "masked");

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe("masked");
    });

    it("should filter request items", () => {
      const result = filterByVisibility(items, "request");

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe("request");
    });

    it("should return empty array if no matches", () => {
      const result = filterByVisibility([], "public");

      expect(result).toHaveLength(0);
    });
  });

  describe("parseEnhancedContent", () => {
    it("should parse JSON string", () => {
      const json = '{"name":"John","age":30}';
      const result = parseEnhancedContent(json);

      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
    });

    it("should return object as-is", () => {
      const obj = { name: "John", age: 30 };
      const result = parseEnhancedContent(obj);

      expect(result).toEqual(obj);
    });

    it("should return empty object for invalid JSON", () => {
      const result = parseEnhancedContent("{invalid json}");

      expect(result).toEqual({});
    });

    it("should return empty object for null/undefined", () => {
      expect(parseEnhancedContent(null)).toEqual({});
      expect(parseEnhancedContent(undefined)).toEqual({});
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3];
      const result = parseEnhancedContent(arr);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(arr);
    });
  });

  describe("hasRequestItems", () => {
    it("should return true if items contain request visibility", () => {
      const items = [
        { visibility: "public" as const },
        { visibility: "request" as const },
      ];

      expect(hasRequestItems(items)).toBe(true);
    });

    it("should return false if no request items", () => {
      const items = [
        { visibility: "public" as const },
        { visibility: "masked" as const },
      ];

      expect(hasRequestItems(items)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasRequestItems([])).toBe(false);
    });
  });

  describe("hasMaskedItems", () => {
    it("should return true if items contain masked visibility", () => {
      const items = [
        { visibility: "public" as const },
        { visibility: "masked" as const },
      ];

      expect(hasMaskedItems(items)).toBe(true);
    });

    it("should return false if no masked items", () => {
      const items = [
        { visibility: "public" as const },
        { visibility: "request" as const },
      ];

      expect(hasMaskedItems(items)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasMaskedItems([])).toBe(false);
    });
  });

  describe("sanitizeResumeForPublicView", () => {
    const baseResume = {
      userId: "user-1",
      summary: "Full stack engineer",
      contact: {
        email: { value: "john@example.com", visibility: "public" as const },
        phone: { value: "555-123-4567", visibility: "public" as const },
      },
      personalInfo: {
        email: "john@example.com",
        phone: "555-123-4567",
        name: "John Doe",
      },
    };

    it("masks email and phone values", () => {
      const sanitized = sanitizeResumeForPublicView(baseResume);

      expect(sanitized.contact.email.value).toBe("j***@example.com");
      expect(sanitized.contact.email.visibility).toBe("masked");
      expect(sanitized.contact.phone.value).toBe("***-***-4567");
      expect(sanitized.contact.phone.visibility).toBe("masked");
      expect(sanitized.personalInfo.email).toBe("j***@example.com");
      expect(sanitized.personalInfo.phone).toBe("***-***-4567");
    });

    it("preserves request visibility without revealing values", () => {
      const resume = {
        ...baseResume,
        contact: {
          email: { value: "john@example.com", visibility: "request" as const },
          phone: { value: "555-123-4567", visibility: "request" as const },
        },
      };

      const sanitized = sanitizeResumeForPublicView(resume);

      expect(sanitized.contact.email.visibility).toBe("request");
      expect(sanitized.contact.email.value).toBe("");
      expect(sanitized.personalInfo.email).toBe("Available upon request");
      expect(sanitized.contact.phone.visibility).toBe("request");
      expect(sanitized.contact.phone.value).toBe("");
      expect(sanitized.personalInfo.phone).toBe("Available upon request");
    });

    it("adds viewer access metadata", () => {
      const sanitized = sanitizeResumeForPublicView(baseResume);

      expect(sanitized.viewerAccess).toEqual(
        expect.objectContaining({
          scope: "public-preview",
          isOwner: false,
          isMasked: true,
        })
      );
    });

    it("does not mutate the original resume object", () => {
      const original = JSON.parse(JSON.stringify(baseResume));
      sanitizeResumeForPublicView(baseResume);
      expect(baseResume).toEqual(original);
    });

    it("masks personalInfo fields even if contact fields are missing", () => {
      const resume = {
        userId: "user-1",
        summary: "Full stack engineer",
        contact: {}, // Empty contact
        personalInfo: {
          email: "john@example.com",
          phone: "555-123-4567",
          name: "John Doe",
        },
      };

      const sanitized = sanitizeResumeForPublicView(resume);

      expect(sanitized.personalInfo.email).toBe("j***@example.com");
      expect(sanitized.personalInfo.phone).toBe("***-***-4567");
    });

    it("clears detailed sections for snapshot view", () => {
      const resume = {
        ...baseResume,
        experience: [{ company: "Tech Corp", role: "Dev" }],
        education: [{ school: "University", degree: "BS" }],
        projects: [{ name: "Project A" }],
      };

      const sanitized = sanitizeResumeForPublicView(resume);

      expect(sanitized.experience).toEqual([]);
      expect(sanitized.education).toEqual([]);
      expect(sanitized.projects).toEqual([]);
      expect(sanitized.viewerAccess.isSnapshot).toBe(true);
    });
  });
});
