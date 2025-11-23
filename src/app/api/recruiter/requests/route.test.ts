import { GET } from "./route";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collectionGroup: jest.fn(),
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}));

describe("GET /api/recruiter/requests", () => {
  const mockUserId = "recruiter-123";
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {} as NextRequest;
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (handleApiError as jest.Mock).mockImplementation(
      (error, message, status) => ({
        status: status || 500,
        json: async () => ({ error: message }),
      })
    );
    (NextResponse.json as jest.Mock).mockImplementation((data) => data);
  });

  it("should return 401 if user is not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: null });

    await GET(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(null, "Unauthorized", 401);
  });

  it("should return error if getAuthenticatedUserId returns error", async () => {
    const mockError = {
      status: 400,
      json: async () => ({ error: "Bad Request" }),
    };
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: mockError,
    });

    const response = await GET(mockRequest);

    expect(response).toBe(mockError);
  });

  it("should fetch requests successfully", async () => {
    const mockRequests = [
      {
        id: "req-1",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: { toDate: () => new Date("2023-01-01T00:00:00Z") },
          status: "pending",
        }),
        ref: {
          parent: {
            parent: { id: "resume-1" },
          },
        },
      },
    ];

    const mockResumeDoc = {
      exists: true,
      data: () => ({ title: "Software Engineer", userId: "candidate-1" }),
    };

    const mockUserDoc = {
      data: () => ({ displayName: "John Doe" }),
    };

    // Mock chain for collectionGroup
    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    // Mock chain for collection (resumes and users)
    const mockDocGetResume = jest.fn().mockResolvedValue(mockResumeDoc);
    const mockDocGetUser = jest.fn().mockResolvedValue(mockUserDoc);

    const mockDocResume = jest.fn().mockReturnValue({ get: mockDocGetResume });
    const mockDocUser = jest.fn().mockReturnValue({ get: mockDocGetUser });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") return { doc: mockDocResume };
      if (collectionName === "users") return { doc: mockDocUser };
      return { doc: jest.fn() };
    });

    const response = await GET(mockRequest);

    expect(adminDb.collectionGroup).toHaveBeenCalledWith("accessRequests");
    expect(mockWhere).toHaveBeenCalledWith("fromUserId", "==", mockUserId);
    expect(mockOrderBy).toHaveBeenCalledWith("timestamp", "desc");

    // Verify response structure
    expect(response).toEqual({
      requests: [
        {
          id: "req-1",
          fromUserId: mockUserId,
          timestamp: "2023-01-01T00:00:00.000Z",
          status: "pending",
          resumeId: "resume-1",
          resumeTitle: "Software Engineer",
          candidateName: "John Doe",
          approvedAt: null,
          expiresAt: null,
          isExpired: false,
          timeRemainingMs: null,
        },
      ],
    });
  });

  it("should handle missing resume and user data gracefully", async () => {
    const mockRequests = [
      {
        id: "req-2",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: new Date("2023-01-02T00:00:00Z").toISOString(), // String timestamp
        }),
        ref: {
          parent: {
            parent: { id: "resume-2" },
          },
        },
      },
    ];

    const mockResumeDoc = {
      exists: false, // Resume not found
      data: () => ({}),
    };

    // Mock chain for collectionGroup
    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    // Mock chain for collection (resumes)
    const mockDocGetResume = jest.fn().mockResolvedValue(mockResumeDoc);
    const mockDocResume = jest.fn().mockReturnValue({ get: mockDocGetResume });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") return { doc: mockDocResume };
      return { doc: jest.fn() };
    });

    const response = await GET(mockRequest);

    expect(response).toEqual({
      requests: [
        {
          id: "req-2",
          fromUserId: mockUserId,
          timestamp: "2023-01-02T00:00:00.000Z",
          resumeId: "resume-2",
          resumeTitle: "Unknown Resume",
          candidateName: "Unknown Candidate",
          approvedAt: null,
          expiresAt: null,
          isExpired: false,
          timeRemainingMs: null,
        },
      ],
    });
  });

  it("should handle database errors", async () => {
    (adminDb.collectionGroup as jest.Mock).mockImplementation(() => {
      throw new Error("Database error");
    });

    await GET(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to fetch recruiter requests"
    );
  });

  it("should handle timestamp parsing errors", async () => {
    const mockRequests = [
      {
        id: "req-3",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: {
            toDate: () => {
              throw new Error("Invalid date");
            },
          },
        }),
        ref: {
          parent: {
            parent: { id: "resume-3" },
          },
        },
      },
    ];

    // Mock chain for collectionGroup
    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    // Mock chain for collection (resumes)
    const mockDocGetResume = jest
      .fn()
      .mockResolvedValue({ exists: false, data: () => ({}) });
    const mockDocResume = jest.fn().mockReturnValue({ get: mockDocGetResume });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") return { doc: mockDocResume };
      return { doc: jest.fn() };
    });

    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const response = (await GET(mockRequest)) as any;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to serialize timestamp"),
      expect.any(Error)
    );

    // Should still return the request with default timestamp (current date)
    expect(response.requests[0].id).toBe("req-3");
    expect(response.requests[0].timestamp).toBeNull();

    consoleSpy.mockRestore();
  });
});
