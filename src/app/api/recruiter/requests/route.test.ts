import { GET, POST, DELETE } from "./route";
import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { RecruiterService } from "@/lib/services/recruiterService";

// Mock dependencies
jest.mock("@/lib/services/recruiterService", () => ({
  RecruiterService: {
    getRecruiterRequests: jest.fn(),
    deleteRecruiterRequest: jest.fn(),
    enforceRecruiterRole: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status) => {
    return Response.json(
      { error: message, details: error?.message },
      { status: status || 500 },
    );
  }),
}));

describe("/api/recruiter/requests", () => {
  const recruiterId = "rec-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: recruiterId,
    });
  });

  const buildRequest = (url: string, method: string) =>
    new NextRequest(url, { method });

  describe("GET", () => {
    it("returns 403 if not a recruiter", async () => {
      (RecruiterService.getRecruiterRequests as jest.Mock).mockRejectedValue(
        new Error("forbidden-role"),
      );
      const response = await GET(buildRequest("http://localhost/api", "GET"));
      expect(response.status).toBe(403);
    });

    it("fetches recruiter requests successfully", async () => {
      const mockRequests = [
        {
          id: "req-1",
          resumeId: "res-1",
          fromUserId: recruiterId,
          status: "pending",
          candidateName: "John Doe",
          resumeTitle: "Senior Dev",
          timestamp: new Date().toISOString(),
        },
      ];

      (RecruiterService.getRecruiterRequests as jest.Mock).mockResolvedValue(
        mockRequests,
      );

      const response = await GET(buildRequest("http://localhost/api", "GET"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests[0].candidateName).toBe("John Doe");
      expect(data.requests[0].resumeTitle).toBe("Senior Dev");
      expect(RecruiterService.getRecruiterRequests).toHaveBeenCalledWith(
        recruiterId,
      );
    });
  });

  describe("POST", () => {
    it("returns 405 Method Not Allowed", async () => {
      const response = await POST(buildRequest("http://localhost/api", "POST"));
      expect(response.status).toBe(405);
    });
  });

  describe("DELETE", () => {
    it("returns 400 if params are missing", async () => {
      const response = await DELETE(
        buildRequest("http://localhost/api", "DELETE"),
      );
      expect(response.status).toBe(400);
    });

    it("deletes request successfully", async () => {
      const requestId = "req-1";
      const resumeId = "res-1";

      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockResolvedValue({
        success: true,
      });

      const response = await DELETE(
        buildRequest(
          `http://localhost/api?requestId=${requestId}&resumeId=${resumeId}`,
          "DELETE",
        ),
      );
      expect(response.status).toBe(200);
      expect(RecruiterService.deleteRecruiterRequest).toHaveBeenCalledWith(
        recruiterId,
        requestId,
        resumeId,
      );
    });

    it("returns 403 if unauthorized", async () => {
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("unauthorized"),
      );
      const response = await DELETE(
        buildRequest("http://localhost/api?requestId=1&resumeId=2", "DELETE"),
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 if not found", async () => {
      (RecruiterService.deleteRecruiterRequest as jest.Mock).mockRejectedValue(
        new Error("request-not-found"),
      );
      const response = await DELETE(
        buildRequest("http://localhost/api?requestId=1&resumeId=2", "DELETE"),
      );
      expect(response.status).toBe(404);
    });
  });
});
