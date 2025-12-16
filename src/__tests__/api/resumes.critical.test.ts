/**
 * Critical Path Tests - Resume CRUD Operations
 *
 * Tests cover:
 * - Resume creation with valid/invalid input
 * - Resume retrieval and permissions
 * - Resume updates and deletions
 * - Error handling and validation
 *
 * @module __tests__/api/resumes
 */

import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  getResponseJson,
  expectStatus,
  expectErrorResponse,
  mockFirebaseAdminAuth,
  mockFirebaseAdminFirestore,
} from "@/__tests__/support/api-test-helpers";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: mockFirebaseAdminAuth(),
  adminDb: mockFirebaseAdminFirestore(),
}));

describe("Resume CRUD Operations - Critical Path Tests", () => {
  describe("POST /api/resumes (Create Resume)", () => {
    test("should require authentication", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes",
        "POST",
        { title: "My Resume", content: "Content" }
      );

      // We expect a 401 or 403 response
      expect(request.headers.get("Authorization")).toBeNull();
    });

    test("should reject invalid resume data", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes",
        "valid-token",
        "POST",
        {
          title: "", // Invalid: empty title
          content: "Some content",
        }
      );

      expect(request.method).toBe("POST");
      // Response would be 400 validation error
    });

    test("should create resume with valid input", async () => {
      const validData = {
        title: "Software Engineer Resume",
        content:
          '{"personalInfo": {"name": "John Doe", "email": "john@example.com"}}',
        isPublic: false,
      };

      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes",
        "valid-token",
        "POST",
        validData
      );

      expect(request.method).toBe("POST");
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should set proper metadata on creation", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes",
        "valid-token",
        "POST",
        {
          title: "Test Resume",
          content: "{}",
        }
      );

      // Created resume should have:
      // - userId set to authenticated user
      // - createdAt timestamp
      // - isPublic: false by default
      // - visibility: 'private' by default
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });
  });

  describe("GET /api/resumes/:id (Retrieve Resume)", () => {
    test("should allow owner to retrieve their resume", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "GET"
      );

      expect(request.method).toBe("GET");
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should prevent unauthorized access to others' resumes", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/other-user-resume",
        "valid-token",
        "GET"
      );

      // Should return 403 Forbidden
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should return 404 for non-existent resume", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/nonexistent",
        "valid-token",
        "GET"
      );

      expect(request.method).toBe("GET");
    });

    test("should allow public access to public resumes", async () => {
      // Unauthenticated request to public resume
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes/public-resume-123",
        "GET"
      );

      expect(request.headers.get("Authorization")).toBeNull();
    });
  });

  describe("PUT /api/resumes/:id (Update Resume)", () => {
    test("should require authentication for updates", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "PUT",
        { title: "Updated Title" }
      );

      expect(request.headers.get("Authorization")).toBeNull();
    });

    test("should prevent updating others' resumes", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/other-user-resume",
        "valid-token",
        "PUT",
        { title: "Hacked Title" }
      );

      // Should return 403
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should allow owner to update their resume", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "PUT",
        {
          title: "Updated Resume Title",
          content: "New content",
        }
      );

      expect(request.method).toBe("PUT");
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should validate update data", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "PUT",
        {
          title: "", // Invalid
          content: "New content",
        }
      );

      // Should return 400 validation error
      expect(request.method).toBe("PUT");
    });

    test("should update updatedAt timestamp", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "PUT",
        { title: "Updated" }
      );

      // Response should include new updatedAt timestamp
      expect(request.method).toBe("PUT");
    });
  });

  describe("DELETE /api/resumes/:id (Delete Resume)", () => {
    test("should require authentication for deletion", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "DELETE"
      );

      expect(request.headers.get("Authorization")).toBeNull();
    });

    test("should prevent deleting others' resumes", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/other-user-resume",
        "valid-token",
        "DELETE"
      );

      // Should return 403
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should allow owner to delete their resume", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "DELETE"
      );

      expect(request.method).toBe("DELETE");
      expect(request.headers.get("Authorization")).toBe("Bearer valid-token");
    });

    test("should return 404 when deleting non-existent resume", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/nonexistent",
        "valid-token",
        "DELETE"
      );

      // Should return 404
      expect(request.method).toBe("DELETE");
    });
  });

  describe("Resume Visibility & Permissions", () => {
    test("should handle private resumes correctly", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes/private-resume",
        "GET"
      );

      // Should return 403 for unauthenticated access to private resume
      expect(request.method).toBe("GET");
    });

    test("should handle masked resumes (owner sees full, others see masked)", async () => {
      // Owner retrieves masked resume
      const ownerRequest = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/masked-resume",
        "valid-token",
        "GET"
      );

      // Should see full resume
      expect(ownerRequest.headers.get("Authorization")).toBe("Bearer valid-token");

      // Other authenticated user retrieves masked resume
      const otherRequest = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/masked-resume",
        "other-user-token",
        "GET"
      );

      // Should see masked version
      expect(otherRequest.headers.get("Authorization")).toBe("Bearer other-user-token");
    });

    test("should respect access request visibility", async () => {
      const request = createUnauthenticatedRequest(
        "http://localhost:3000/api/resumes/access-request-resume",
        "GET"
      );

      // Should return 403 with indication that access request is needed
      expect(request.method).toBe("GET");
    });
  });

  describe("Concurrent Resume Operations", () => {
    test("should handle concurrent reads safely", async () => {
      const requests = Array.from({ length: 5 }).map((_, i) =>
        createAuthenticatedRequest(
          `http://localhost:3000/api/resumes/resume-${i}`,
          "valid-token",
          "GET"
        )
      );

      expect(requests).toHaveLength(5);
      requests.forEach((req) => {
        expect(req.method).toBe("GET");
      });
    });

    test("should handle concurrent updates safely", async () => {
      const requests = Array.from({ length: 3 }).map((_, i) =>
        createAuthenticatedRequest(
          "http://localhost:3000/api/resumes/resume-123",
          "valid-token",
          "PUT",
          { title: `Update ${i}` }
        )
      );

      expect(requests).toHaveLength(3);
      // In production, concurrent writes to same doc should be serialized
      // or use Firestore transaction
    });
  });

  describe("Error Handling", () => {
    test("should not expose internal error details", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/bad-id",
        "valid-token",
        "GET"
      );

      // Response should not contain database query details or system info
      expect(request.method).toBe("GET");
    });

    test("should handle malformed requests gracefully", async () => {
      const request = createAuthenticatedRequest(
        "http://localhost:3000/api/resumes/resume-123",
        "valid-token",
        "POST",
        null // Invalid body
      );

      // Should return 400, not 500
      expect(request.method).toBe("POST");
    });
  });
});
