import { GET, PATCH, DELETE } from "@/app/api/drafts/[draftId]/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { DRAFT_CONFIG } from "@/config/constants";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(),
  safeParseBody: jest.fn(),
}));

jest.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/config/constants", () => ({
  DRAFT_CONFIG: {
    COLLECTION: "drafts",
    ID_MAPPING_COLLECTION: "draft_mappings",
  },
  VALIDATION: {
    MAX_TITLE_LENGTH: 200,
    MAX_SUMMARY_LENGTH: 2000,
    MAX_SKILLS: 50,
    MAX_EXPERIENCE_ENTRIES: 20,
    MAX_EDUCATION_ENTRIES: 10,
  },
}));

describe("/api/drafts/[draftId]", () => {
  const mockUserId = "user-123";
  const mockDraftId = "draft-456";
  const mockParams = Promise.resolve({ draftId: mockDraftId });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful auth
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    // Default successful rate limit
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });

    // Default handleApiError implementation
    (handleApiError as jest.Mock).mockImplementation(
      (error, message, status = 500) => {
        return new Response(JSON.stringify({ error: message }), { status });
      }
    );
  });

  describe("GET", () => {
    it("should return 401 if authentication fails", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: new Response("Unauthorized", { status: 401 }),
      });

      const req = new NextRequest("http://localhost/api/drafts/123");
      const res = await GET(req, { params: mockParams });

      expect(res.status).toBe(401);
    });

    it("should return 404 if draft not found", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123");
      const res = await GET(req, { params: mockParams });

      expect(res.status).toBe(404);
      expect(handleApiError).toHaveBeenCalledWith(null, "Draft not found", 404);
    });

    it("should return 403 if user is not owner", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123");
      const res = await GET(req, { params: mockParams });

      expect(res.status).toBe(403);
      expect(handleApiError).toHaveBeenCalledWith(null, "Forbidden", 403);
    });

    it("should return draft data on success", async () => {
      const mockData = { userId: mockUserId, profile: { name: "Test" } };
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123");
      const res = await GET(req, { params: mockParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockData);
    });

    it("should handle generic errors", async () => {
      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      const req = new NextRequest("http://localhost/api/drafts/123");
      await GET(req, { params: mockParams });

      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to fetch draft"
      );
    });
  });

  describe("PATCH", () => {
    it("should return 401 if authentication fails", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: new Response("Unauthorized", { status: 401 }),
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(401);
    });

    it("should return 429 if rate limit exceeded", async () => {
      (checkRateLimit as jest.Mock).mockReturnValue({ allowed: false });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(429);
      expect(handleApiError).toHaveBeenCalledWith(
        null,
        expect.stringContaining("Too many updates"),
        429
      );
    });

    it("should return 400 if body parsing fails", async () => {
      (safeParseBody as jest.Mock).mockRejectedValue(new Error("Invalid JSON"));

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(400);
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Invalid JSON payload",
        400
      );
    });

    it("should return 400 if validation fails", async () => {
      (safeParseBody as jest.Mock).mockResolvedValue({
        profile: { invalidField: 123 }, // Assuming schema validation fails here or structure is wrong
      });
      // Note: We are relying on the actual Zod schema here.
      // If DraftPatchRequestSchema expects specific structure, we might need to trigger it.
      // Let's pass something clearly invalid for DraftPatchRequestSchema if possible,
      // or mock the schema if we imported it directly.
      // Since we imported the real schema, let's try to pass something that fails it.
      // DraftPatchRequestSchema likely expects 'profile' to be an object.
      // Let's pass an empty object if required fields are missing, or invalid types.
      // Assuming 'profile' is optional but if present must be object.
      // Let's pass a type mismatch.
      (safeParseBody as jest.Mock).mockResolvedValue({
        profile: "not-an-object",
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(400);
      expect(handleApiError).toHaveBeenCalledWith(
        null,
        expect.stringContaining("Validation failed"),
        400
      );
    });

    it("should return 404 if draft not found", async () => {
      (safeParseBody as jest.Mock).mockResolvedValue({ profile: {} });

      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(404);
    });

    it("should return 403 if user is not owner", async () => {
      (safeParseBody as jest.Mock).mockResolvedValue({ profile: {} });

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });

      expect(res.status).toBe(403);
    });

    it("should update draft and return new data on success", async () => {
      (safeParseBody as jest.Mock).mockResolvedValue({
        profile: { title: "Updated Title" },
      });

      const mockData = {
        userId: mockUserId,
        profile: { title: "Original Title" },
      };
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      });
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockDoc = jest.fn().mockReturnValue({
        get: mockGet,
        update: mockUpdate,
      });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      const res = await PATCH(req, { params: mockParams });
      const json = await res.json();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({ title: "Updated Title" }),
          updatedAt: expect.any(String),
        })
      );
      expect(json.profile.title).toBe("Updated Title");
      expect(res.status).toBe(200);
    });

    it("should handle generic errors", async () => {
      (checkRateLimit as jest.Mock).mockImplementation(() => {
        throw new Error("Rate limit error");
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "PATCH",
      });
      await PATCH(req, { params: mockParams });

      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to update draft"
      );
    });
  });

  describe("DELETE", () => {
    it("should return 401 if authentication fails", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: new Response("Unauthorized", { status: 401 }),
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: mockParams });

      expect(res.status).toBe(401);
    });

    it("should return 404 if draft not found", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: mockParams });

      expect(res.status).toBe(404);
    });

    it("should return 403 if user is not owner", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: mockParams });

      expect(res.status).toBe(403);
    });

    it("should delete draft and mapping on success", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId }),
      });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

      const mockBatchDelete = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue({});
      (adminDb.batch as jest.Mock).mockReturnValue({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: mockParams });
      const json = await res.json();

      expect(mockBatchDelete).toHaveBeenCalledTimes(2); // Draft and Mapping
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(json.success).toBe(true);
    });

    it("should handle generic errors", async () => {
      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      const req = new NextRequest("http://localhost/api/drafts/123", {
        method: "DELETE",
      });
      await DELETE(req, { params: mockParams });

      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to delete draft"
      );
    });
  });
});
