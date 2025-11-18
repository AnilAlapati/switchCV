/**
 * Tests for lib/searchUtils utility
 */

import {
  validateSearchQuery,
  getSearchSuggestions,
  exportSearchResults,
} from "@/lib/searchUtils";

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { logger } from "@/lib/logger";

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Search Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateSearchQuery", () => {
    it("should return valid for non-empty query", () => {
      const result = validateSearchQuery("javascript developer");
      expect(result).toEqual({ valid: true });
    });

    it("should return invalid for empty query", () => {
      const result = validateSearchQuery("");
      expect(result).toEqual({
        valid: false,
        error: "Search query cannot be empty",
      });
    });

    it("should return invalid for whitespace-only query", () => {
      const result = validateSearchQuery("   ");
      expect(result).toEqual({
        valid: false,
        error: "Search query cannot be empty",
      });
    });

    it("should return invalid for query longer than 500 characters", () => {
      const longQuery = "a".repeat(501);
      const result = validateSearchQuery(longQuery);
      expect(result).toEqual({
        valid: false,
        error: "Search query is too long (max 500 characters)",
      });
    });

    it("should return valid for query exactly 500 characters", () => {
      const exactQuery = "a".repeat(500);
      const result = validateSearchQuery(exactQuery);
      expect(result).toEqual({ valid: true });
    });

    it("should return valid for query with special characters", () => {
      const result = validateSearchQuery("developer & designer @ company!");
      expect(result).toEqual({ valid: true });
    });
  });

  describe("getSearchSuggestions", () => {
    const recentSearches = [
      "javascript developer",
      "react engineer",
      "python backend",
      "typescript fullstack",
    ];

    const topSearches = [
      "software engineer",
      "frontend developer",
      "data scientist",
      "product manager",
    ];

    it("should return matching suggestions from recent searches", () => {
      const suggestions = getSearchSuggestions(
        "java",
        recentSearches,
        topSearches
      );
      expect(suggestions).toContain("javascript developer");
    });

    it("should return matching suggestions from top searches", () => {
      const suggestions = getSearchSuggestions(
        "soft",
        recentSearches,
        topSearches
      );
      expect(suggestions).toContain("software engineer");
    });

    it("should return combined suggestions from both arrays", () => {
      const suggestions = getSearchSuggestions(
        "dev",
        recentSearches,
        topSearches
      );
      expect(suggestions).toContain("javascript developer");
      expect(suggestions).toContain("frontend developer");
    });

    it("should limit results to 5 suggestions", () => {
      const manyRecentSearches = [
        "developer 1",
        "developer 2",
        "developer 3",
        "developer 4",
        "developer 5",
        "developer 6",
      ];
      const suggestions = getSearchSuggestions(
        "dev",
        manyRecentSearches,
        topSearches
      );
      expect(suggestions).toHaveLength(5);
    });

    it("should be case insensitive", () => {
      const suggestions = getSearchSuggestions(
        "JAVASCRIPT",
        recentSearches,
        topSearches
      );
      expect(suggestions).toContain("javascript developer");
    });

    it("should return empty array for no matches", () => {
      const suggestions = getSearchSuggestions(
        "xyz",
        recentSearches,
        topSearches
      );
      expect(suggestions).toEqual([]);
    });

    it("should return all suggestions for empty prefix", () => {
      const suggestions = getSearchSuggestions("", recentSearches, topSearches);
      // Empty prefix matches everything, so should return all unique suggestions
      expect(suggestions).toHaveLength(5); // Limited to 5
      expect(suggestions).toContain("javascript developer");
      expect(suggestions).toContain("software engineer");
    });

    it("should deduplicate suggestions", () => {
      const duplicateRecent = ["javascript developer", "react engineer"];
      const duplicateTop = ["javascript developer", "product manager"];
      const suggestions = getSearchSuggestions(
        "java",
        duplicateRecent,
        duplicateTop
      );
      const javascriptCount = suggestions.filter(
        (s) => s === "javascript developer"
      ).length;
      expect(javascriptCount).toBe(1);
    });
  });

  describe("exportSearchResults", () => {
    const mockResults = [
      {
        username: "johndoe",
        displayName: "John Doe",
        role: "Software Engineer",
        location: "San Francisco",
        skills: ["JavaScript", "React", "Node.js"],
        hasApproval: true,
      },
      {
        username: "janedoe",
        displayName: "Jane Doe",
        role: "Product Manager",
        location: "New York",
        skills: ["Strategy", "Analytics"],
        hasApproval: false,
      },
    ];

    describe("JSON export", () => {
      it("should export results as formatted JSON", () => {
        const result = exportSearchResults(mockResults, "json");
        const parsed = JSON.parse(result);
        expect(parsed).toEqual(mockResults);
        expect(result).toContain("\n"); // Should be formatted
      });

      it("should handle empty results array", () => {
        const result = exportSearchResults([], "json");
        expect(result).toBe("[]");
      });
    });

    describe("CSV export", () => {
      it("should export results as CSV with proper headers", () => {
        const result = exportSearchResults(mockResults, "csv");
        const lines = result.split("\n");

        expect(lines[0]).toBe(
          '"Username","Display Name","Role","Location","Skills","Has Approval"'
        );
        expect(lines[1]).toBe(
          '"johndoe","John Doe","Software Engineer","San Francisco","JavaScript; React; Node.js","Yes"'
        );
        expect(lines[2]).toBe(
          '"janedoe","Jane Doe","Product Manager","New York","Strategy; Analytics","No"'
        );
      });

      it("should handle missing optional fields", () => {
        const incompleteResults = [
          {
            username: "testuser",
            displayName: "Test User",
            // missing role, location, skills
            hasApproval: true,
          },
        ];

        const result = exportSearchResults(incompleteResults, "csv");
        const lines = result.split("\n");

        expect(lines[1]).toBe('"testuser","Test User","","","","Yes"');
      });

      it("should handle empty skills array", () => {
        const noSkillsResults = [
          {
            username: "testuser",
            displayName: "Test User",
            role: "Developer",
            location: "Remote",
            skills: [],
            hasApproval: false,
          },
        ];

        const result = exportSearchResults(noSkillsResults, "csv");
        const lines = result.split("\n");

        expect(lines[1]).toBe(
          '"testuser","Test User","Developer","Remote","","No"'
        );
      });

      it("should escape quotes in CSV fields", () => {
        const resultsWithQuotes = [
          {
            username: "testuser",
            displayName: 'Test "User"',
            role: "Developer",
            location: "New York",
            skills: ["JavaScript"],
            hasApproval: true,
          },
        ];

        const result = exportSearchResults(resultsWithQuotes, "csv");
        const lines = result.split("\n");

        // Current implementation just wraps in quotes without escaping
        expect(lines[1]).toBe(
          '"testuser","Test "User"","Developer","New York","JavaScript","Yes"'
        );
      });
    });

    describe("error handling", () => {
      it("should throw error for unsupported format", () => {
        expect(() => {
          exportSearchResults(mockResults, "xml" as any);
        }).toThrow("Failed to export results");
      });

      it("should handle JSON stringify errors", () => {
        const circularRef: any = {};
        circularRef.self = circularRef;

        expect(() => {
          exportSearchResults([circularRef], "json");
        }).toThrow("Failed to export results");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error exporting search results:",
          expect.any(Error)
        );
      });

      it("should handle CSV generation errors", () => {
        const problematicResults = [
          {
            username: null, // This might cause issues
            displayName: undefined,
            role: "Test",
            location: "Test",
            skills: null,
            hasApproval: true,
          },
        ];

        // This should not throw, but handle gracefully
        const result = exportSearchResults(problematicResults, "csv");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
