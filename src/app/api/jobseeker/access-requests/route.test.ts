import { NextRequest } from "next/server";
import { GET } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { adminDb } from "@/lib/firebase-admin";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

describe("GET /api/jobseeker/access-requests", () => {
  const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.Mock;
  const mockCollection = adminDb.collection as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: null });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/access-requests"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return access requests for authenticated user", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const mockAccessRequests = [
      {
        id: "req1",
        data: () => ({
          requesterId: "recruiter1",
          status: "pending",
          timestamp: { toDate: () => new Date("2024-01-01") },
        }),
      },
    ];

    const mockResumes = [
      {
        id: "resume1",
        data: () => ({ title: "Frontend Dev" }),
        ref: {
          collection: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                size: 1,
                docs: mockAccessRequests,
              }),
            }),
          }),
        },
      },
    ];

    mockCollection.mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 1,
          docs: mockResumes,
        }),
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/access-requests"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0]).toEqual({
      id: "req1",
      requesterId: "recruiter1",
      status: "pending",
      timestamp: "2024-01-01T00:00:00.000Z",
      resumeId: "resume1",
      resumeTitle: "Frontend Dev",
    });
  });

  it("should handle errors gracefully", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    mockCollection.mockImplementation(() => {
      throw new Error("Database error");
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/access-requests"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch requests");
  });
});
