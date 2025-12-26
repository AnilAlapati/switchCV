import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  buildBaseConstraints,
  getCursorSnapshot,
  matchesAllFilters,
  searchBySlug,
  buildNormalizedFilters,
  type NormalizedFilters,
} from "@/app/api/profiles/search/search-query";
import * as searchUtils from "@/app/api/profiles/search/search-utils";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/app/api/profiles/search/search-utils", () => ({
  normalizeSkills: jest.fn((s) => s || []),
  includesAllSkills: jest.fn(),
  mapProfileResult: jest.fn(),
  matchesQuery: jest.fn(),
  extractProfileSkills: jest.fn(),
}));

describe("search-query utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchUtils.normalizeSkills as jest.Mock).mockImplementation((s) => s || []);
  });

  describe("buildBaseConstraints", () => {
    it("should build base constraints with only visibility filter", () => {
      const filters: NormalizedFilters = { skills: [] };
      buildBaseConstraints(filters);
      expect(where).toHaveBeenCalledWith("publicProfile.visible", "==", true);
    });

    it("should add role constraint", () => {
      buildBaseConstraints({ role: "Engineer", skills: [] });
      expect(where).toHaveBeenCalledWith("publicProfile.role", "==", "Engineer");
    });

    it("should add location constraint", () => {
      buildBaseConstraints({ location: "NYC", skills: [] });
      expect(where).toHaveBeenCalledWith("publicProfile.location", "==", "NYC");
    });

    it("should add slug constraint", () => {
      buildBaseConstraints({ slug: "test", skills: [] });
      expect(where).toHaveBeenCalledWith("profileSlug", "==", "test");
    });

    it("should add array-contains for single skill", () => {
      buildBaseConstraints({ skills: ["React"] });
      expect(where).toHaveBeenCalledWith("publicProfile.skills", "array-contains", "React");
    });

    it("should add array-contains-any for multiple skills", () => {
      buildBaseConstraints({ skills: ["React", "TS"] });
      expect(where).toHaveBeenCalledWith("publicProfile.skills", "array-contains-any", ["React", "TS"]);
    });
  });

  describe("getCursorSnapshot", () => {
    it("should return null if no cursorId", async () => {
      expect(await getCursorSnapshot()).toBeNull();
    });

    it("should return snapshot if exists", async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });
      const result = await getCursorSnapshot("id");
      expect(result).toBeDefined();
    });

    it("should return null if not exists", async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      expect(await getCursorSnapshot("id")).toBeNull();
    });
  });

  describe("matchesAllFilters", () => {
    it("should return true if all filters match", () => {
      (searchUtils.extractProfileSkills as jest.Mock).mockReturnValue(["React"]);
      (searchUtils.includesAllSkills as jest.Mock).mockReturnValue(true);
      (searchUtils.matchesQuery as jest.Mock).mockReturnValue(true);

      const userData = {
        publicProfile: { role: "Engineer", location: "NYC" }
      };
      const filters = { role: "Engineer", location: "NYC", skills: ["React"] };
      
      expect(matchesAllFilters(userData, filters, "query")).toBe(true);
    });

    it("should return false if role mismatch", () => {
      const userData = { publicProfile: { role: "Designer" } };
      const filters = { role: "Engineer", skills: [] };
      expect(matchesAllFilters(userData, filters)).toBe(false);
    });
  });

  describe("searchBySlug", () => {
    it("should return results if slug found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: "1", data: () => ({}) }]
      });
      (searchUtils.mapProfileResult as jest.Mock).mockReturnValue({ id: "1" });

      const results = await searchBySlug({ slug: "test", skills: [] });
      expect(results).toHaveLength(1);
    });

    it("should return empty if slug not found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });
      const results = await searchBySlug({ slug: "test", skills: [] });
      expect(results).toHaveLength(0);
    });
  });

  describe("buildNormalizedFilters", () => {
    it("should normalize filters", () => {
      const result = buildNormalizedFilters({
        role: " Engineer ",
        location: " NYC ",
        skills: ["React"],
        slug: " test "
      });
      expect(result).toEqual({
        role: "Engineer",
        location: "NYC",
        skills: ["React"],
        slug: "test"
      });
    });

    it("should handle empty filters", () => {
      const result = buildNormalizedFilters({});
      expect(result.skills).toEqual([]);
    });
  });
});
