import { sanitizeResumePayload } from "./resumeEditor";
import { pruneUndefined } from "@/lib/utils/pruneUndefined";

// Mock pruneUndefined
jest.mock("@/lib/utils/pruneUndefined", () => ({
  pruneUndefined: jest.fn(),
}));

describe("resumeEditor utils", () => {
  describe("sanitizeResumePayload", () => {
    beforeEach(() => {
      // Default implementation: return the object as is (or a copy)
      (pruneUndefined as jest.Mock).mockImplementation((obj) => obj);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should remove top-level reserved fields", () => {
      const payload = {
        skills: [],
        userId: "user-1", // Reserved
        createdAt: "2023-01-01", // Reserved
        extra: "field",
      };
      const result = sanitizeResumePayload(payload);
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("createdAt");
      expect(result).toHaveProperty("skills");
      expect(result).toHaveProperty("extra");
    });

    it("should handle null or undefined payload", () => {
      expect(sanitizeResumePayload(null as any)).toEqual({});
      expect(sanitizeResumePayload(undefined as any)).toEqual({});
    });

    it("should return empty object if pruneUndefined returns non-object (e.g. null)", () => {
      (pruneUndefined as jest.Mock).mockReturnValueOnce(null);
      const result = sanitizeResumePayload({ a: 1 });
      expect(result).toEqual({});
    });

    it("should return empty object if pruneUndefined returns undefined", () => {
      (pruneUndefined as jest.Mock).mockReturnValueOnce(undefined);
      const result = sanitizeResumePayload({ a: 1 });
      expect(result).toEqual({});
    });
  });
});
