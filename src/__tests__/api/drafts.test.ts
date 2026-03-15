import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/drafts/[draftId]/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import {
  getDraft,
  updateDraft,
  deleteDraft,
} from "@/lib/services/draftService";
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
      { status: status || 500 },
    ),
  ),
  safeParseBody: jest.fn(),
}));
jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn(),
}));
jest.mock("@/lib/getSystemConfig");
jest.mock("@/lib/services/draftService", () => ({
  getDraft: jest.fn(),
  updateDraft: jest.fn(),
  deleteDraft: jest.fn(),
}));
jest.mock("@/lib/schemas/draftSchema", () => ({
  getDraftProfileUpdateSchema: jest.fn(),
}));

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
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
    });
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
      (getDraft as jest.Mock).mockResolvedValue(null);
      await GET(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(null, "Draft not found", 404);
    });

    it("should return 403 if not owner", async () => {
      (getDraft as jest.Mock).mockRejectedValue(
        new Error("Forbidden: Not the owner of this draft"),
      );
      await GET(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        new Error("Forbidden: Not the owner of this draft"),
        "Forbidden",
        403,
      );
    });

    it("should return draft data if owner", async () => {
      const mockData = { userId: mockUserId, content: "test" };
      (getDraft as jest.Mock).mockResolvedValue(mockData);
      const response = await GET(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data).toEqual(mockData);
    });
  });

  describe("PATCH", () => {
    it("should return 429 if rate limited", async () => {
      (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
      });
      await PATCH(new NextRequest("http://localhost"), { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        null,
        "Too many updates. Please wait a moment.",
        429,
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
        expect.objectContaining({ issues: expect.any(Array) }),
        expect.stringContaining("Validation failed"),
        400,
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
      (updateDraft as jest.Mock).mockResolvedValue({
        profile: { firstName: "John" },
      });

      const response = await PATCH(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data.profile.firstName).toBe("John");
      expect(updateDraft).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete draft if owner", async () => {
      (deleteDraft as jest.Mock).mockResolvedValue(true);

      const response = await DELETE(new NextRequest("http://localhost"), {
        params: mockParams,
      });
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(deleteDraft).toHaveBeenCalled();
    });
  });
});
