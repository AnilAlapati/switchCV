import { GET, POST, DELETE } from "@/app/api/recruiter/requests/route";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { RecruiterService } from "@/lib/services/recruiterService";
import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/firebase-admin");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 },
    );
  }),
}));
jest.mock("@/lib/services/recruiterService");
jest.mock("@/lib/services/metricsService");
jest.mock("@/lib/logger");

const mockGetAuth = getAuthenticatedUserId as jest.Mock;
const mockUserId = "recruiter-123";

function makeRequest(
  method: string,
  params?: Record<string, string>,
): NextRequest {
  const url = new URL("http://localhost/api/recruiter/requests");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url, { method });
}

describe("Recruiter Requests API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET ─────────────────────────────────────────────────

  describe("GET /api/recruiter/requests", () => {
    it("should return auth error when authentication fails", async () => {
      mockGetAuth.mockResolvedValue({
        userId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(401);
    });

    it("should return 401 when userId is null without error response", async () => {
      mockGetAuth.mockResolvedValue({ userId: null, error: null });
      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(401);
    });

    it("should return requests on success", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      const mockRequests = [{ id: "r1", status: "pending" }];
      (RecruiterService.getRecruiterRequests as jest.Mock).mockResolvedValue(
        mockRequests,
      );

      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.requests).toEqual(mockRequests);
    });

    it("should return 403 for forbidden-role error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.getRecruiterRequests as jest.Mock).mockRejectedValue(
        new Error("forbidden-role"),
      );

      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(403);
    });

    it("should return 500 for generic errors", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.getRecruiterRequests as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(500);
    });
  });

  // ── POST ────────────────────────────────────────────────

  describe("POST /api/recruiter/requests", () => {
    it("should return auth error when not authenticated", async () => {
      mockGetAuth.mockResolvedValue({
        userId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const response = await POST(makeRequest("POST"));
      expect(response.status).toBe(401);
    });

    it("should return 401 when userId is null", async () => {
      mockGetAuth.mockResolvedValue({ userId: null, error: null });
      const response = await POST(makeRequest("POST"));
      expect(response.status).toBe(401);
    });

    it("should return 405 when recruiter role enforced successfully", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.enforceRecruiterRole as jest.Mock).mockResolvedValue(
        undefined,
      );

      const response = await POST(makeRequest("POST"));
      expect(response.status).toBe(405);
    });

    it("should return 403 when forbidden-role error thrown", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.enforceRecruiterRole as jest.Mock).mockRejectedValue(
        new Error("forbidden-role"),
      );

      const response = await POST(makeRequest("POST"));
      expect(response.status).toBe(403);
    });

    it("should return 500 on generic error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.enforceRecruiterRole as jest.Mock).mockRejectedValue(
        new Error("unexpected"),
      );

      const response = await POST(makeRequest("POST"));
      expect(response.status).toBe(500);
    });
  });

  // ── DELETE ──────────────────────────────────────────────

  describe("DELETE /api/recruiter/requests", () => {
    it("should return auth error when not authenticated", async () => {
      mockGetAuth.mockResolvedValue({
        userId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const response = await DELETE(makeRequest("DELETE"));
      expect(response.status).toBe(401);
    });

    it("should return 401 when userId is null", async () => {
      mockGetAuth.mockResolvedValue({ userId: null, error: null });
      const response = await DELETE(makeRequest("DELETE"));
      expect(response.status).toBe(401);
    });

    it("should return 400 when requestId or resumeId missing", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      const response = await DELETE(makeRequest("DELETE"));
      expect(response.status).toBe(400);
    });

    it("should return 400 when only requestId is provided", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1" }),
      );
      expect(response.status).toBe(400);
    });

    it("should delete successfully when both params given", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      const mockResult = { success: true };
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1", resumeId: "res-1" }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("should return 403 on forbidden-role error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("forbidden-role"),
      );

      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1", resumeId: "res-1" }),
      );
      expect(response.status).toBe(403);
    });

    it("should return 404 on request-not-found error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("request-not-found"),
      );

      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1", resumeId: "res-1" }),
      );
      expect(response.status).toBe(404);
    });

    it("should return 403 on unauthorized error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("unauthorized"),
      );

      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1", resumeId: "res-1" }),
      );
      expect(response.status).toBe(403);
    });

    it("should return 500 on generic error", async () => {
      mockGetAuth.mockResolvedValue({ userId: mockUserId, error: null });
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("db failure"),
      );

      const response = await DELETE(
        makeRequest("DELETE", { requestId: "req-1", resumeId: "res-1" }),
      );
      expect(response.status).toBe(500);
    });
  });
});
