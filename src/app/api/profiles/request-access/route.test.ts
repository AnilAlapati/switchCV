import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        collection: jest.fn(),
      })),
    })),
    collectionGroup: jest.fn(),
  },
}));

// Mock API helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

// Mock notification service
jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn(),
}));

// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

// Helper to create mock document snapshots
const createMockDocSnapshot = (exists: boolean, data?: any, id?: string) => ({
  exists,
  data: () => data,
  id: id || (exists ? "mock-doc-id" : ""),
});

const createMockQuerySnapshot = (docs: any[]) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback: (doc: any) => void) => docs.forEach(callback),
});

describe("POST /api/profiles/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow request if previous grant is expired", async () => {
    const currentUserId = "recruiter-123";
    const resumeId = "resume-456";
    const resumeOwnerId = "user-789";

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: currentUserId,
      error: undefined,
    });

    // Mock user data (recruiter)
    const recruiterDoc = createMockDocSnapshot(true, {
      displayName: "Recruiter Name",
      companyName: "Tech Corp",
    });

    // Mock resume data
    const resumeDoc = createMockDocSnapshot(true, {
      userId: resumeOwnerId,
    });

    // Mock expired grant
    const expiredGrantDoc = createMockDocSnapshot(true, {
      toUserId: currentUserId,
      expiresAt: {
        toDate: () => new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
      },
    });

    // Mock pending requests (none)
    const pendingRequestsSnapshot = createMockQuerySnapshot([]);

    // Mock grants snapshot (one expired grant)
    const grantsSnapshot = createMockQuerySnapshot([expiredGrantDoc]);

    const mockAdd = jest.fn().mockResolvedValue({ id: "new-request-id" });

    mockAdminDb.collectionGroup.mockImplementation((collectionName: string) => {
      if (collectionName === "accessRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(createMockQuerySnapshot([])),
        } as any;
      }
      return {} as any;
    });

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(recruiterDoc),
          })),
        } as any;
      } else if (collectionName === "resumes") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(resumeDoc),
            collection: jest.fn((subCollection: string) => {
              if (subCollection === "accessRequests") {
                return {
                  where: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue(pendingRequestsSnapshot),
                  })),
                  add: mockAdd,
                };
              } else if (subCollection === "accessGrants") {
                return {
                  where: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue(grantsSnapshot),
                  })),
                };
              }
              return {};
            }),
          })),
        } as any;
      } else if (collectionName === "jobSeekerMetrics") {
        return {
          doc: jest.fn(() => ({
            set: jest.fn().mockResolvedValue(undefined),
          })),
        } as any;
      }
      return {} as any;
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId,
          message: "Please give access",
          duration: { preset: "1_week" },
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("should reject request if active grant exists", async () => {
    const currentUserId = "recruiter-123";
    const resumeId = "resume-456";
    const resumeOwnerId = "user-789";

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: currentUserId,
      error: undefined,
    });

    const recruiterDoc = createMockDocSnapshot(true, {
      displayName: "Recruiter Name",
      companyName: "Tech Corp",
    });

    const resumeDoc = createMockDocSnapshot(true, {
      userId: resumeOwnerId,
    });

    // Mock active grant
    const activeGrantDoc = createMockDocSnapshot(true, {
      toUserId: currentUserId,
      expiresAt: {
        toDate: () => new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
      },
    });

    const pendingRequestsSnapshot = createMockQuerySnapshot([]);
    const grantsSnapshot = createMockQuerySnapshot([activeGrantDoc]);

    mockAdminDb.collectionGroup.mockImplementation((collectionName: string) => {
      if (collectionName === "accessRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(createMockQuerySnapshot([])),
        } as any;
      }
      return {} as any;
    });

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(recruiterDoc),
          })),
        } as any;
      } else if (collectionName === "resumes") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(resumeDoc),
            collection: jest.fn((subCollection: string) => {
              if (subCollection === "accessRequests") {
                return {
                  where: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue(pendingRequestsSnapshot),
                  })),
                };
              } else if (subCollection === "accessGrants") {
                return {
                  where: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue(grantsSnapshot),
                  })),
                };
              }
              return {};
            }),
          })),
        } as any;
      }
      return {} as any;
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId,
          message: "Please give access",
          duration: { preset: "1_week" },
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("You already have access to this resume");
  });
});
