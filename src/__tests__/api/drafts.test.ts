import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/drafts/[draftId]/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { getDraftProfileUpdateSchema } from "@/lib/schemas/draftSchema";

jest.mock("@/lib/firebase-admin", () => {
  const mockBatch = {
    delete: jest.fn().mockReturnThis(),
    commit: jest.fn().mockResolvedValue(true),
  };
  return {
    adminDb: {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      batch: jest.fn(() => mockBatch),
    },
  };
});

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error", success: false },
      { status: status || 500 }
    )
  ),
  safeParseBody: jest.fn(),
}));
jest.mock("@/lib/utils/rateLimit");
jest.mock("@/lib/getSystemConfig");
jest.mock("@/lib/schemas/draftSchema");

describe("Drafts API", () => {
  const mockDraftId = "draft-123";
  const mockUserId = "user-123";
  const mockParams = Promise.resolve({ draftId: mockDraftId });

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (getConstants as jest.Mock).mockResolvedValue({
      RATE_LIMITS: { DRAFT_UPDATES_PER_MINUTE: 10 },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        error: "Unauthorized",
      });
      const response = await GET(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      expect(response).toBe("Unauthorized");
    });

    it("should return 404 if draft not found", async () => {
      (adminDb.get as jest.Mock).mockResolvedValue({ exists: false });
      await GET(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(null, "Draft not found", 404);
    });

    it("should return 403 if not owner", async () => {
      (adminDb.get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      await GET(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(null, "Forbidden", 403);
    });

    it("should return draft data if owner", async () => {
      const mockData = { userId: mockUserId, content: "test" };
      (adminDb.get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => mockData,
      });
      const response = await GET(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data).toEqual(mockData);
    });
  });

  describe("PATCH", () => {
    it("should return 429 if rate limited", async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false });
      await PATCH(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        null,
        "Too many updates. Please wait a moment.",
        429
      );
    });

    it("should return 400 if validation fails", async () => {
      (safeParseBody as jest.Mock).mockResolvedValue({ invalid: "data" });
      (getDraftProfileUpdateSchema as jest.Mock).mockResolvedValue({
        DraftPatchRequestSchema: {
          safeParse: () => ({
            success: false,
            error: { issues: [{ path: ["field"], message: "error" }] },
          }),
        },
      });
      await PATCH(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        null,
        expect.stringContaining("Validation failed"),
        400
      );
    });

    it("should update draft if owner", async () => {
      const updates = { profile: { firstName: "John" } };
      (safeParseBody as jest.Mock).mockResolvedValue(updates);
      (getDraftProfileUpdateSchema as jest.Mock).mockResolvedValue({
        DraftPatchRequestSchema: {
          safeParse: () => ({ success: true, data: updates }),
        },
      });
      (adminDb.get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId, profile: {} }),
      });
      (adminDb.update as jest.Mock).mockResolvedValue({ writeTime: {} });

      const response = await PATCH(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data.profile.firstName).toBe("John");
      expect(adminDb.update).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete draft if owner", async () => {
      (adminDb.get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId }),
      });

      const response = await DELETE(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data.success).toBe(true);
      // Verify batch was used
      expect(adminDb.batch).toHaveBeenCalled();
    });
  });
});
