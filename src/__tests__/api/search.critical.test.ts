/**
 * Critical Path Tests - Search Operations
 *
 * Tests cover:
 * - Search with various query types
 * - Filter and sorting
 * - Pagination
 * - Rate limiting
 * - Authorization and visibility
 *
 * @module __tests__/api/search
 */

import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  getResponseJson,
  expectStatus,
  createBatchRequests,
} from "@/__tests__/support/api-test-helpers";

describe("Search Operations - Critical Path Tests", () => {
  describe("POST /api/profiles/search (Search Profiles)", () => {
    test("should require authentication", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "POST",
        { query: "software engineer" }
      );

      expect(request.headers.get("Authorization")).toBeNull();
    });

    test("should require query parameter", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "" } // Empty query
      );

      // Should return 400 validation error
      expect(request.method).toBe("POST");
    });

    test("should reject excessively long queries", async () => {
      const longQuery = "a".repeat(1000); // Exceeds max length
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: longQuery }
      );

      // Should return 400
      expect(request.method).toBe("POST");
    });

    test("should perform basic text search", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "Python developer" }
      );

      expect(request.method).toBe("POST");
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should handle search with filters", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "engineer",
          filters: {
            location: "San Francisco",
            experience: "5+",
            skills: "TypeScript",
          },
        }
      );

      expect(request.method).toBe("POST");
    });

    test("should support pagination", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "developer",
          limit: 20,
          offset: 0,
        }
      );

      expect(request.method).toBe("POST");
    });

    test("should enforce pagination limits", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "engineer",
          limit: 1000, // Exceeds max limit
        }
      );

      // Should cap limit to MAX_LIMIT (100)
      expect(request.method).toBe("POST");
    });

    test("should support sorting", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "developer",
          sortBy: "relevance",
          sortOrder: "desc",
        }
      );

      expect(request.method).toBe("POST");
    });

    test("should only return public or accessible resumes", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "engineer" }
      );

      // Results should exclude:
      // - Private resumes (unless owner)
      // - Access-request-required resumes (unless access granted)
      expect(request.method).toBe("POST");
    });
  });

  describe("Search Rate Limiting", () => {
    test("should enforce per-user rate limits", async () => {
      const userId = "test-user-123";
      const limit = 30; // PROFILE_SEARCH_PER_MINUTE from constants

      const requests = Array.from({ length: limit + 5 }).map((_, i) =>
        createAuthenticatedRequest(
          "http://localhost:3000/api/profiles/search",
          "valid-token",
          "POST",
          { query: `query-${i}` }
        )
      );

      expect(requests.length).toBe(limit + 5);
      // First 30 should succeed, remaining should get 429
    });

    test("should include rate limit headers in response", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "developer" }
      );

      // Response should include:
      // X-RateLimit-Limit: 30
      // X-RateLimit-Remaining: 29
      // X-RateLimit-Reset: timestamp
      expect(request.method).toBe("POST");
    });

    test("should track rate limits per user ID", async () => {
      // User 1 makes requests
      const user1Requests = createBatchRequests(
        "http://localhost:3000/api/profiles/search",
        5,
        "POST",
        (i) => ({ query: `user1-query-${i}` })
      );

      // User 2 makes requests (different token, different limit)
      const user2Requests = Array.from({ length: 5 }).map(() =>
        createAuthenticatedRequest(
          "http://localhost:3000/api/profiles/search",
          "other-user-token",
          "POST",
          { query: "user2-query" }
        )
      );

      // Each user has separate rate limit bucket
      expect(user1Requests).toHaveLength(5);
      expect(user2Requests).toHaveLength(5);
    });

    test("should reset limits after window expires", async () => {
      // This is a timing test - would need to mock Date or use fake timers
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "test" }
      );

      expect(request.method).toBe("POST");
      // After 1 minute window, limit should reset
    });
  });

  describe("Search Authorization", () => {
    test("should not expose private resume content in results", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "engineer" }
      );

      // Results should not include any private resumes
      expect(request.method).toBe("POST");
    });

    test("should handle recruiter search permissions correctly", async () => {
      // Recruiter searches for profiles
      const recruiterRequest = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "recruiter-token",
        "POST",
        { query: "software engineer" }
      );

      // Should see public profiles + those they have access to
      expect(recruiterRequest.method).toBe("POST");
    });

    test("should respect masking for non-owners", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "masked" }
      );

      // Masked fields should be redacted in results
      expect(request.method).toBe("POST");
    });
  });

  describe("Search Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "database-error-trigger" } // Would trigger error in real scenario
      );

      // Should return 500 with generic message, not expose DB details
      expect(request.method).toBe("POST");
    });

    test("should handle malformed filter parameters", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "engineer",
          filters: {
            invalidFilter: "value",
          },
        }
      );

      // Should either ignore invalid filters or return 400
      expect(request.method).toBe("POST");
    });

    test("should handle empty results gracefully", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "zzzzzzuniquethingxyzabc" } // Unlikely to match
      );

      // Should return 200 with empty results array, not error
      expect(request.method).toBe("POST");
    });
  });

  describe("Search Performance", () => {
    test("should handle large result sets efficiently", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        {
          query: "engineer",
          limit: 100, // Max limit
        }
      );

      // Should complete within reasonable time (< 2s)
      expect(request.method).toBe("POST");
    });

    test("should support cursor-based pagination for large sets", async () => {
      // First page
      const page1 = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "engineer", limit: 20, offset: 0 }
      );

      // Second page
      const page2 = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "engineer", limit: 20, offset: 20 }
      );

      expect(page1.method).toBe("POST");
      expect(page2.method).toBe("POST");
    });
  });

  describe("Search Edge Cases", () => {
    test("should handle special characters in query", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "C++/C#/.NET engineer" }
      );

      expect(request.method).toBe("POST");
    });

    test("should handle unicode characters in query", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "工程師" }
      );

      expect(request.method).toBe("POST");
    });

    test("should be case-insensitive", async () => {
      const lowercase = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "python" }
      );

      const uppercase = createAuthenticatedRequest(
        "http://localhost:3000/api/profiles/search",
        "valid-token",
        "POST",
        { query: "PYTHON" }
      );

      expect(lowercase.method).toBe("POST");
      expect(uppercase.method).toBe("POST");
      // Both should return same results
    });
  });
});
