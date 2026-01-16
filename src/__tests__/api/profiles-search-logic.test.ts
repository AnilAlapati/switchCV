import * as searchUtils from "@/app/api/profiles/search/search-utils";
import { db } from "@/lib/firebase";
import { getDoc } from "firebase/firestore";

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

describe("Profiles Search Logic (search-utils)", () => {
  describe("search-utils base functionality", () => {
    it("normalizeSkills should handle various inputs", () => {
      expect(
        searchUtils.normalizeSkills([" React ", null as any, "Node"])
      ).toEqual(["React", "Node"]);
      expect(searchUtils.normalizeSkills(undefined)).toEqual([]);
    });

    it("includesAllSkills should check skills correctly", () => {
      expect(searchUtils.includesAllSkills(["React", "Node"], ["react"])).toBe(
        true
      );
      expect(searchUtils.includesAllSkills(["React"], ["Node"])).toBe(false);
      expect(searchUtils.includesAllSkills(["React"], [])).toBe(true);
    });

    it("matchesQuery should be case insensitive", () => {
      expect(searchUtils.matchesQuery("Hello World", "hello")).toBe(true);
      expect(searchUtils.matchesQuery("Hello World", "bye")).toBe(false);
    });

    it("extractProfileSkills should handle string and object skills", () => {
      const userData = {
        publicProfile: {
          skills: ["React", { name: "Node" }, null],
        },
      };
      expect(searchUtils.extractProfileSkills(userData)).toEqual([
        "React",
        "Node",
      ]);
      expect(searchUtils.extractProfileSkills({})).toEqual([]);
    });

    it("mapProfileResult should map correctly", () => {
      const userData = {
        displayName: "Test",
        publicProfile: {
          username: "testuser",
          role: "Dev",
          skills: ["React"],
        },
      };
      const result = searchUtils.mapProfileResult("u1", userData);
      expect(result.userId).toBe("u1");
      expect(result.displayName).toBe("Test");
      expect(result.role).toBe("Dev");
      expect(result.skills).toEqual(["React"]);
    });
  });

  describe("search-utils filter logic", () => {
    it("buildNormalizedFilters should return defaults", () => {
      const filters = searchUtils.buildNormalizedFilters({});
      expect(filters.skills).toEqual([]);
    });

    it("buildNormalizedFilters should normalize inputs", () => {
      const filters = searchUtils.buildNormalizedFilters({
        role: "Dev",
        skills: [" React "],
      });
      expect(filters.role).toBe("Dev");
      expect(filters.skills).toEqual(["React"]);
    });

    it("matchesAllFilters should validate correctly", () => {
      const userData = {
        displayName: "Anil",
        publicProfile: {
          role: "Developer",
          skills: ["React"],
          aiSelectedBio: "Senior Dev",
        },
        profileSlug: "anil",
      };
      const filters = {
        role: "Developer",
        skills: ["React"],
      };
      expect(
        searchUtils.matchesAllFilters(userData, filters as any, "anil")
      ).toBe(true);

      expect(
        searchUtils.matchesAllFilters(userData, {
          ...filters,
          role: "Manager",
        } as any)
      ).toBe(false);

      expect(
        searchUtils.matchesAllFilters(userData, {
          ...filters,
          skills: ["Node"],
        } as any)
      ).toBe(false);
    });
  });
});
