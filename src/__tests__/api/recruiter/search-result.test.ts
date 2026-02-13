import {
  maskEmail,
  getDisplayName,
} from "@/app/api/recruiter/search-resumes/search-result";

describe("search-result utilities", () => {
  describe("maskEmail", () => {
    it("should mask the user part of an email address", () => {
      expect(maskEmail("john@example.com")).toBe("jo***@example.com");
    });

    it("should handle short usernames", () => {
      expect(maskEmail("ab@example.com")).toBe("ab***@example.com");
    });

    it("should handle single-char usernames", () => {
      expect(maskEmail("a@example.com")).toBe("a***@example.com");
    });

    it("should return the original string when no @ is present", () => {
      expect(maskEmail("noemail")).toBe("noemail");
    });

    it("should return the original string when empty", () => {
      expect(maskEmail("")).toBe("");
    });

    it("should handle email with subdomains", () => {
      expect(maskEmail("user@mail.company.co.uk")).toBe(
        "us***@mail.company.co.uk",
      );
    });
  });

  describe("getDisplayName", () => {
    it("should return displayName when available", () => {
      expect(getDisplayName({ displayName: "Jane Doe" })).toBe("Jane Doe");
    });

    it("should return masked email when no displayName", () => {
      expect(getDisplayName({ email: "jane@example.com" })).toBe(
        "ja***@example.com",
      );
    });

    it("should prefer displayName over email", () => {
      expect(
        getDisplayName({ displayName: "Jane", email: "jane@example.com" }),
      ).toBe("Jane");
    });

    it("should return 'Unknown' when neither displayName nor email", () => {
      expect(getDisplayName({})).toBe("Unknown");
    });

    it("should return 'Unknown' for completely empty user data", () => {
      expect(getDisplayName({ displayName: "", email: "" })).toBe("Unknown");
    });

    it("should fall back to email if displayName is empty string", () => {
      expect(getDisplayName({ displayName: "", email: "a@b.com" })).toBe(
        "a***@b.com",
      );
    });
  });
});
