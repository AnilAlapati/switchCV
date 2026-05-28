import { maskEmail, getDisplayName } from "./search-result";

describe("search-result utilities", () => {
  describe("maskEmail", () => {
    it("should mask email correctly", () => {
      expect(maskEmail("testuser@example.com")).toBe("te***@example.com");
    });

    it("should handle short usernames", () => {
      expect(maskEmail("a@example.com")).toBe("a***@example.com");
    });

    it("should return original string if not an email", () => {
      expect(maskEmail("notanemail")).toBe("notanemail");
    });
  });

  describe("getDisplayName", () => {
    it("should return displayName if present", () => {
      expect(getDisplayName({ displayName: "John Doe" })).toBe("John Doe");
    });

    it("should return masked email if displayName is missing but email is present", () => {
      expect(getDisplayName({ email: "john@example.com" })).toBe(
        "jo***@example.com"
      );
    });

    it("should return 'Unknown' if both are missing", () => {
      expect(getDisplayName({})).toBe("Unknown");
    });

    it("should mask name if accessStatus is present and not approved", () => {
      expect(getDisplayName({ displayName: "Anil Alapati" }, "none")).toBe("Anil A.");
      expect(getDisplayName({ displayName: "Anil Alapati" }, "pending")).toBe("Anil A.");
      expect(getDisplayName({ displayName: "Anil Alapati" }, "denied")).toBe("Anil A.");
    });

    it("should NOT mask name if accessStatus is approved", () => {
      expect(getDisplayName({ displayName: "Anil Alapati" }, "approved")).toBe("Anil Alapati");
    });

    it("should NOT mask name if accessStatus is missing/undefined", () => {
      expect(getDisplayName({ displayName: "Anil Alapati" })).toBe("Anil Alapati");
    });
  });
});
