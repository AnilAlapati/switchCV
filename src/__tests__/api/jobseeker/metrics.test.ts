import { GET } from "@/app/api/jobseeker/metrics/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { NextRequest } from "next/server";

jest.mock("@/lib/firebase-admin");
jest.mock("@/lib/utils/api-helpers");
jest.mock("@/lib/logger");

(handleApiError as jest.Mock).mockImplementation((error, message, status = 500) => {
  return Response.json({ error: message }, { status });
});

describe("GET /api/jobseeker/metrics", () => {
  const mockUserId = "user-123";
  const mockRequest = (userId: string) =>
    new NextRequest(`http://localhost/api/jobseeker/metrics?userId=${userId}`, {
      method: "GET",
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}), docs: [] }),
      set: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockReturnThis(),
    }));
  });

  it("should return 401 when user is not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: new Response("Unauthorized", { status: 401 }),
    });

    const response = await GET(mockRequest(mockUserId));
    expect(response.status).toBe(401);
  });

  it("should return 400 when userId param is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    const request = new NextRequest("http://localhost/api/jobseeker/metrics", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 403 when user tries to access another user's metrics (BOLA prevention)", async () => {
    const otherUserId = "user-456";

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    const response = await GET(mockRequest(otherUserId));

    expect(response.status).toBe(403);
  });

  it("should return metrics for authenticated user accessing their own data", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    const mockMetricsDoc = {
      exists: true,
      data: jest.fn().mockReturnValue({
        profileViews: 42,
        contactRequests: 5,
        lastUpdated: new Date(),
        downloads: 10,
        quality: 85,
      }),
    };

    (adminDb.collection as jest.Mock).mockImplementation((name) => {
      if (name === "jobSeekerMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockMetricsDoc),
            set: jest.fn().mockResolvedValue({}),
          }),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    });

    const response = await GET(mockRequest(mockUserId));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profileViews).toBe(42);
    expect(data.contactRequests).toBe(5);
  });

  it("should return empty metrics when user has no data", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    const mockMetricsDoc = {
      exists: false,
      data: jest.fn(),
    };

    (adminDb.collection as jest.Mock).mockImplementation((name) => {
      if (name === "jobSeekerMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockMetricsDoc),
            set: jest.fn().mockResolvedValue({}),
          }),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    });

    const response = await GET(mockRequest(mockUserId));

    expect(response.status).toBe(200);
    const data = await response.json();
    // Should return default/empty metrics
  });

  it("should handle database errors gracefully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error("Firestore error")),
      }),
    });

    const response = await GET(mockRequest(mockUserId));

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
