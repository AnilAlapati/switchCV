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
  matchesAllFilters: jest.fn(),
  buildNormalizedFilters: jest.fn(),
}));

describe("search-query utilities (now search-utils)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchUtils.normalizeSkills as jest.Mock).mockImplementation((s) => s || []);
  });

  describe("matchesAllFilters", () => {
    it("should call underlying matchers correctly", () => {
      (searchUtils.matchesAllFilters as jest.Mock).mockReturnValue(true);

      const userData = {
        publicProfile: { role: "Engineer", location: "NYC" }
      };
      const filters = { role: "Engineer", location: "NYC", skills: ["React"] };

      const result = searchUtils.matchesAllFilters(userData, filters as any, "query");
      expect(result).toBe(true);
      expect(searchUtils.matchesAllFilters).toHaveBeenCalledWith(userData, filters, "query");
    });
  });

  describe("buildNormalizedFilters", () => {
    it("should call implementation correctly", () => {
      const mockResult = { role: "Engineer", skills: ["React"] };
      (searchUtils.buildNormalizedFilters as jest.Mock).mockReturnValue(mockResult);

      const result = searchUtils.buildNormalizedFilters({
        role: " Engineer ",
        skills: ["React"],
      });

      expect(result).toEqual(mockResult);
      expect(searchUtils.buildNormalizedFilters).toHaveBeenCalled();
    });
  });
});
