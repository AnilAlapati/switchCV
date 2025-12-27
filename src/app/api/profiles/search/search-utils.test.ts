import {
  normalizeSkills,
  includesAllSkills,
  matchesQuery,
  extractProfileSkills,
  mapProfileResult,
} from "./search-utils";

describe("search-utils", () => {
  describe("normalizeSkills", () => {
    it("should return empty array if input is not an array", () => {
      expect(normalizeSkills(undefined)).toEqual([]);
      expect(normalizeSkills(null as any)).toEqual([]);
    });

    it("should trim and filter empty skills", () => {
      expect(normalizeSkills([" React ", "", "  ", "TypeScript"])).toEqual([
        "React",
        "TypeScript",
      ]);
    });
  });

  describe("includesAllSkills", () => {
    it("should return true if no required skills", () => {
      expect(includesAllSkills(["React"], [])).toBe(true);
      expect(includesAllSkills(["React"], undefined)).toBe(true);
    });

    it("should return true if all required skills are present (case-insensitive)", () => {
      expect(
        includesAllSkills(["React", "TypeScript"], ["react", "type"])
      ).toBe(true);
    });

    it("should return false if any required skill is missing", () => {
      expect(includesAllSkills(["React"], ["React", "Node"])).toBe(false);
    });
  });

  describe("matchesQuery", () => {
    it("should return true if text includes query (case-insensitive)", () => {
      expect(matchesQuery("Software Engineer", "engineer")).toBe(true);
    });

    it("should return false if text does not include query", () => {
      expect(matchesQuery("Software Engineer", "doctor")).toBe(false);
    });

    it("should handle empty text or query", () => {
      expect(matchesQuery("", "query")).toBe(false);
      expect(matchesQuery("text", "")).toBe(true);
    });
  });

  describe("extractProfileSkills", () => {
    it("should return empty array if skills is not an array", () => {
      expect(extractProfileSkills({})).toEqual([]);
    });

    it("should extract skills from strings and objects", () => {
      const userData = {
        publicProfile: {
          skills: ["React", { name: "TypeScript" }, { id: 1 }, ""],
        },
      };
      expect(extractProfileSkills(userData)).toEqual(["React", "TypeScript"]);
    });
  });

  describe("mapProfileResult", () => {
    it("should map user data to ProfileSearchResult", () => {
      const userData = {
        displayName: "John Doe",
        photoURL: "http://photo.com",
        publicProfile: {
          username: "johndoe",
          aiSelectedBio: "Bio",
          role: "Engineer",
          location: "NYC",
          skills: ["React"],
        },
      };
      const result = mapProfileResult("user123", userData);
      expect(result).toEqual({
        userId: "user123",
        username: "johndoe",
        displayName: "John Doe",
        photoURL: "http://photo.com",
        bio: "Bio",
        role: "Engineer",
        location: "NYC",
        skills: ["React"],
        hasApproval: false,
        approvalExpiresAt: undefined,
      });
    });

    it("should handle missing optional fields", () => {
      const result = mapProfileResult("user123", {});
      expect(result).toEqual({
        userId: "user123",
        username: "",
        displayName: "",
        photoURL: undefined,
        bio: "",
        role: undefined,
        location: undefined,
        skills: undefined,
        hasApproval: false,
        approvalExpiresAt: undefined,
      });
    });
  });
});
