import { GET, DELETE } from "./route";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import {
  decrementJobSeekerMetric,
  updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/services/metricsService", () => ({
  decrementJobSeekerMetric: jest.fn(),
  updateRecruiterAccessMetric: jest.fn(),
}));

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
      data: () => ({ displayName: "John Doe", role: "recruiter" }),
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

    const mockRecruiterDoc = {
      exists: true,
      data: () => ({ role: "recruiter" }),
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
      if (collectionName === "users")
        return {
          doc: jest
            .fn()
            .mockReturnValue({
              get: jest.fn().mockResolvedValue(mockRecruiterDoc),
            }),
        };
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

    const mockRecruiterDoc = {
      exists: true,
      data: () => ({ role: "recruiter" }),
    };

    // Mock chain for collection (resumes)
    const mockDocGetResume = jest
      .fn()
      .mockResolvedValue({ exists: false, data: () => ({}) });
    const mockDocResume = jest.fn().mockReturnValue({ get: mockDocGetResume });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") return { doc: mockDocResume };
      if (collectionName === "users")
        return {
          doc: jest
            .fn()
            .mockReturnValue({
              get: jest.fn().mockResolvedValue(mockRecruiterDoc),
            }),
        };
      return { doc: jest.fn() };
    });

    const response = (await GET(mockRequest)) as any;

    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Failed to serialize timestamp"
    );

    // Should still return the request with default timestamp (current date)
    expect(response.requests[0].id).toBe("req-3");
    expect(response.requests[0].timestamp).toBeNull();
  });

  it("should handle requests with expiresAt", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const mockRequests = [
      {
        id: "req-4",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: { toDate: () => new Date() },
          expiresAt: { toDate: () => futureDate },
          status: "approved",
        }),
        ref: {
          parent: {
            parent: { id: "resume-4" },
          },
        },
      },
    ];

    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter" }),
            }),
          }),
        };
      }
      return {
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      };
    });

    const response = (await GET(mockRequest)) as any;
    expect(response.requests[0].isExpired).toBe(false);
    expect(response.requests[0].timeRemainingMs).toBeGreaterThan(0);
  });

  it("should handle requests with expired expiresAt", async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    const mockRequests = [
      {
        id: "req-5",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: { toDate: () => new Date() },
          expiresAt: { toDate: () => pastDate },
          status: "approved",
        }),
        ref: {
          parent: {
            parent: { id: "resume-5" },
          },
        },
      },
    ];

    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    const response = (await GET(mockRequest)) as any;
    expect(response.requests[0].isExpired).toBe(true);
    expect(response.requests[0].timeRemainingMs).toBeLessThan(0);
  });

  it("should handle invalid expiresAt date", async () => {
    const mockRequests = [
      {
        id: "req-6",
        data: () => ({
          fromUserId: mockUserId,
          timestamp: { toDate: () => new Date() },
          expiresAt: "invalid-date",
          status: "approved",
        }),
        ref: {
          parent: {
            parent: { id: "resume-6" },
          },
        },
      },
    ];

    const mockGet = jest.fn().mockResolvedValue({ docs: mockRequests });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: mockWhere,
    });

    const response = (await GET(mockRequest)) as any;
    expect(response.requests[0].expiresAt).toBeNull();
  });

  it("should return 403 if user is not a recruiter", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "jobseeker" }),
            }),
          }),
        };
      }
      return {
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      };
    });

    await GET(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(
      null,
      "Forbidden: Recruiter role required",
      403
    );
  });
});

describe("DELETE /api/recruiter/requests", () => {
  const mockUserId = "recruiter-123";
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      url: "http://localhost/api/recruiter/requests?requestId=req-1&resumeId=res-1",
    } as NextRequest;
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

  it("should delete request successfully", async () => {
    const mockRequestData = {
      fromUserId: mockUserId,
      status: "pending",
    };

    const mockRequestDoc = {
      exists: true,
      data: () => mockRequestData,
    };

    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockResolvedValue(mockRequestDoc);

    const mockResumeDoc = {
      exists: true,
      data: () => ({ userId: "jobseeker-123" }),
    };

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return {
          doc: jest.fn().mockImplementation((id) => {
            if (id === "res-1") {
              return {
                get: jest.fn().mockResolvedValue(mockResumeDoc),
                collection: jest.fn().mockReturnValue({
                  doc: jest.fn().mockReturnValue({
                    get: mockGet,
                    delete: mockDelete,
                  }),
                }),
              };
            }
            return { get: jest.fn() };
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const response = await DELETE(mockRequest);

    expect(response).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(decrementJobSeekerMetric).toHaveBeenCalledWith(
      "jobseeker-123",
      "contactRequests"
    );
    expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(
      mockUserId,
      "pending",
      -1
    );
  });

  it("should return 400 if requestId or resumeId is missing", async () => {
    mockRequest = {
      url: "http://localhost/api/recruiter/requests",
    } as NextRequest;

    await DELETE(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(
      null,
      "Missing requestId or resumeId",
      400
    );
  });

  it("should return 404 if request not found", async () => {
    (adminDb.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false }),
          }),
        }),
      }),
    }));

    await DELETE(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(null, "Request not found", 404);
  });

  it("should return 403 if user is not the owner of the request", async () => {
    const mockRequestDoc = {
      exists: true,
      data: () => ({ fromUserId: "other-user" }),
    };

    (adminDb.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockRequestDoc),
          }),
        }),
      }),
    }));

    await DELETE(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(
      null,
      "Unauthorized to delete this request",
      403
    );
  });

  it("should handle errors during delete", async () => {
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("Delete failed");
    });

    await DELETE(mockRequest);

    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to delete request"
    );
  });
});
