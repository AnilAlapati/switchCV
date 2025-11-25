import { ProfileSearchResult } from "@/types/profileSearch";
import type { SearchFilters } from "@/lib/advancedSearch";

const {
  performFullTextSearch,
  applyAdvancedFilters,
  paginateResults,
  saveSavedSearch,
  setupSearchAlert,
} = jest.requireActual("@/lib/advancedSearch");

describe("advancedSearch", () => {
  const mockProfiles: ProfileSearchResult[] = [
    {
      userId: "u1",
      displayName: "John Doe",
      username: "johndoe",
      bio: "Software Engineer",
      skills: ["JavaScript", "TypeScript"],
      location: "New York",
      role: "Developer",
      hasApproval: true,
    },
    {
      userId: "u2",
      displayName: "Jane Smith",
      username: "janesmith",
      bio: "Product Designer",
      skills: ["Figma", "UI/UX"],
      location: "London",
      role: "Designer",
      hasApproval: false,
    },
    {
      userId: "u3",
      displayName: "Bob Wilson",
      username: "bobwilson",
      bio: "Senior Developer",
      skills: ["Java", "Spring"],
      location: "San Francisco",
      role: "Developer",
      hasApproval: true,
    },
  ];

  describe("performFullTextSearch", () => {
    it("should match by display name", () => {
      const results = performFullTextSearch("John", mockProfiles);
      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe("John Doe");
    });

    it("should match by username", () => {
      const results = performFullTextSearch("jane", mockProfiles);
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe("janesmith");
    });

    it("should match by bio", () => {
      const results = performFullTextSearch("Senior", mockProfiles);
      expect(results).toHaveLength(1);
      expect(results[0].bio).toBe("Senior Developer");
    });

    it("should match by skills", () => {
      // None have React, let's try TypeScript
      const results2 = performFullTextSearch("TypeScript", mockProfiles);
      expect(results2).toHaveLength(1);
      expect(results2[0].skills).toContain("TypeScript");
    });

    it("should apply filters if provided", () => {
      const filters: SearchFilters = { location: "London" };
      const results = performFullTextSearch("", mockProfiles, filters);
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe("London");
    });
  });

  describe("applyAdvancedFilters", () => {
    it("should filter by skills", () => {
      const filters: SearchFilters = { skills: ["Figma"] };
      const results = applyAdvancedFilters(mockProfiles, filters);
      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe("Jane Smith");
    });

    it("should filter by location", () => {
      const filters: SearchFilters = { location: "New York" };
      const results = applyAdvancedFilters(mockProfiles, filters);
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe("New York");
    });

    it("should filter by role", () => {
      const filters: SearchFilters = { role: "Designer" };
      const results = applyAdvancedFilters(mockProfiles, filters);
      expect(results).toHaveLength(1);
      expect(results[0].role).toBe("Designer");
    });

    it("should filter by approval status", () => {
      const filters: SearchFilters = { hasApproval: true };
      const results = applyAdvancedFilters(mockProfiles, filters);
      expect(results).toHaveLength(2); // John and Bob
    });
  });

  describe("paginateResults", () => {
    it("should paginate correctly", () => {
      const manyProfiles = Array(25).fill(mockProfiles[0]);
      const result = paginateResults(manyProfiles, 2, 10);
      expect(result.pageNumber).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalResults).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.results).toHaveLength(10);
    });
  });

  describe("saveSavedSearch", () => {
    it("should create a saved search object", () => {
      const result = saveSavedSearch("My Search", "query", { role: "Dev" });
      expect(result.name).toBe("My Search");
      expect(result.query).toBe("query");
      expect(result.filters).toEqual({ role: "Dev" });
      expect(result.id).toBeDefined();
    });

    it("should return the object if passed an object", () => {
      const existing: any = {
        id: "1",
        name: "Existing",
        query: "",
        filters: {},
        createdAt: new Date("2025-11-22T10:36:32.000Z"),
      };
      const result = saveSavedSearch(existing);
      expect(result).toBe(existing);
    });
  });

  describe("setupSearchAlert", () => {
    it("should enable alerts on existing search object", () => {
      const existing: any = {
        id: "1",
        name: "Existing",
        query: "",
        filters: {},
        createdAt: new Date(),
      };
      const result = setupSearchAlert(existing, "daily");
      expect(result.alertEnabled).toBe(true);
      expect(result.alertFrequency).toBe("daily");
    });

    it("should create new search object with alerts if passed ID", () => {
      const result = setupSearchAlert("search-id", "weekly");
      expect(result.id).toBe("search-id");
      expect(result.alertEnabled).toBe(true);
      expect(result.alertFrequency).toBe("weekly");
    });
  });
});
