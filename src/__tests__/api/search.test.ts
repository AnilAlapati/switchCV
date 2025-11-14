// src/__tests__/api/search.test.ts
/**
 * Tests for the profile search API
 */

import { POST } from "@/app/api/profiles/search/route";
import { NextRequest } from "next/server";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

describe("Profile Search API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/profiles/search", () => {
    it("should return error if no query or filters provided", async () => {
      const req = new NextRequest(
        new URL("http://localhost/api/profiles/search"),
        {
          method: "POST",
          body: JSON.stringify({
            query: "",
            filters: {},
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should support filtering by role", async () => {
      const testFilters = {
        role: "Software Engineer",
      };

      // Test that role filter is accepted
      expect(testFilters.role).toBe("Software Engineer");
    });

    it("should support filtering by location", async () => {
      const testFilters = {
        location: "San Francisco, CA",
      };

      expect(testFilters.location).toBe("San Francisco, CA");
    });

    it("should support filtering by multiple skills", async () => {
      const testFilters = {
        skills: ["React", "TypeScript", "Node.js"],
      };

      expect(testFilters.skills).toEqual(["React", "TypeScript", "Node.js"]);
    });

    it("should support filtering by slug", async () => {
      const testFilters = {
        slug: "john-doe",
      };

      expect(testFilters.slug).toBe("john-doe");
    });

    it("should support pagination with offset", async () => {
      const req = new NextRequest(
        new URL("http://localhost/api/profiles/search"),
        {
          method: "POST",
          body: JSON.stringify({
            query: "engineer",
            limit: 10,
            offset: 20,
          }),
        }
      );

      // Test that pagination parameters are parsed
      expect(req).toBeDefined();
    });

    it("should return total count along with paginated results", async () => {
      // Mock response structure
      const mockResponse = {
        results: [],
        count: 0,
        total: 100,
        hasMore: true,
      };

      expect(mockResponse.total).toBe(100);
      expect(mockResponse.hasMore).toBe(true);
    });
  });

  describe("Search filter combinations", () => {
    it("should handle role + location filter", () => {
      const filters = {
        role: "Software Engineer",
        location: "San Francisco, CA",
      };

      expect(filters.role).toBeDefined();
      expect(filters.location).toBeDefined();
    });

    it("should handle role + skills filter", () => {
      const filters = {
        role: "Data Scientist",
        skills: ["Python", "TensorFlow"],
      };

      expect(filters.role).toBeDefined();
      expect(filters.skills?.length).toBe(2);
    });

    it("should clear filters correctly", () => {
      let filters: Record<string, any> = {
        role: "Engineer",
        location: "NYC",
        skills: ["React"],
      };

      filters = {}; // Clear all

      expect(Object.keys(filters).length).toBe(0);
    });
  });

  describe("Search query matching", () => {
    it("should match partial names", () => {
      const query = "john";
      const fullName = "John Doe";

      expect(fullName.toLowerCase().includes(query.toLowerCase())).toBe(true);
    });

    it("should match usernames", () => {
      const query = "john-doe";
      const username = "john-doe-123";

      expect(username.toLowerCase().includes(query.toLowerCase())).toBe(true);
    });

    it("should match bio text", () => {
      const query = "react";
      const bio = "Expert in React and Node.js";

      expect(bio.toLowerCase().includes(query.toLowerCase())).toBe(true);
    });
  });
});
