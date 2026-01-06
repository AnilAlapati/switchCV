import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id", error: null }),
  maybeGetAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id" }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const details =
      error instanceof Error
        ? error.message
        : error
          ? String(error)
          : undefined;
    return {
      status,
      json: async () => ({
        error: message,
        ...(details !== undefined ? { details } : {}),
      }),
    };
  }),
  verifyRecruiterRole: jest.fn().mockResolvedValue(null),
  verifyAdminRole: jest.fn().mockResolvedValue(null),
}));

// Mock getRecruiterSearchBreakdown
jest.mock("@/lib/recruiterSearchHistory", () => ({
  getRecruiterSearchBreakdown: jest.fn().mockResolvedValue({
    searchesLast24h: 0,
    searchesLast7Days: 0,
    uniqueCandidatesLast7Days: 0,
    topSkillsLast7Days: [],
    topLocationsLast7Days: [],
  }),
}));

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockImplementation((userId: string) => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({
          get: jest.fn(),
        })),
      };
    }),
    collectionGroup: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}));

// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

const mockCollection = adminDb.collection as jest.MockedFunction<
  typeof adminDb.collection
>;
const mockCollectionGroup = adminDb.collectionGroup as jest.MockedFunction<
  typeof adminDb.collectionGroup
>;
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockGroupGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();

mockCollection.mockImplementation((collectionName: string) => {
  if (collectionName === "users") {
    return {
      doc: jest.fn().mockImplementation((userId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ role: "admin" }),
        }),
      })),
    };
  }
  return {
    doc: mockDoc,
  } as any;
});

mockCollectionGroup.mockReturnValue({
  where: mockWhere,
} as any);

mockDoc.mockReturnValue({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
} as any);

mockWhere.mockReturnValue({
  get: mockGroupGet,
} as any);

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";

describe("GET /api/recruiter/metrics", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Re-setup api-helpers mocks
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-id",
      error: null,
    });
    (handleApiError as jest.Mock).mockImplementation(
      (error, message, status = 500) => {
        const details =
          error instanceof Error
            ? error.message
            : error
              ? String(error)
              : undefined;
        return {
          status,
          json: async () => ({
            error: message,
            ...(details !== undefined ? { details } : {}),
          }),
        };
      }
    );

    (getRecruiterSearchBreakdown as jest.Mock).mockResolvedValue({
      searchesLast24h: 0,
      searchesLast7Days: 0,
      uniqueCandidatesLast7Days: 0,
      topSkillsLast7Days: [],
      topLocationsLast7Days: [],
    });

    // Re-setup structural mocks after reset
    mockCollection.mockImplementation((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockImplementation((userId: string) => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
        };
      }
      return {
        doc: mockDoc,
      } as any;
    });

    mockCollectionGroup.mockReturnValue({
      where: mockWhere,
    } as any);

    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    } as any);

    mockWhere.mockReturnValue({
      get: mockGroupGet,
    } as any);
  });

  // Helper to create a mock snapshot with forEach
  const createMockSnapshot = (docs: any[]) => ({
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((docData) => {
        callback({
          data: () => docData,
        });
      });
    },
  });

  it("should return metrics for valid userId", async () => {
    // Mock collectionGroup for access requests (first call)
    mockGroupGet.mockResolvedValueOnce(
      createMockSnapshot([
        { status: "pending" },
        { status: "pending" },
        { status: "approved", expiresAt: new Date(Date.now() + 86400000) },
        { status: "denied" },
      ])
    );

    // Mock collectionGroup for access grants (second call)
    mockGroupGet.mockResolvedValueOnce(
      createMockSnapshot([
        {
          toUserId: "recruiter123",
          expiresAt: new Date(Date.now() + 86400000),
        },
      ])
    );

    // Mock metrics doc
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        totalSearches: 15,
        totalProfileViews: 42,
        totalCandidatesInteracted: 12,
        lastActivityAt: "2024-01-15T10:30:00Z",
        accessRequests: {
          pending: 2,
          approved: 1,
          denied: 1,
        },
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter123",
      { headers: { authorization: "Bearer test-token" } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      totalSearches: 15,
      totalProfileViews: 42,
      accessRequests: {
        pending: 2,
        approved: 1,
        denied: 1,
      },
      totalCandidatesInteracted: 12,
      lastActivityAt: "2024-01-15T10:30:00Z",
      searchBreakdown: {
        searchesLast24h: 0,
        searchesLast7Days: 0,
        uniqueCandidatesLast7Days: 0,
        topSkillsLast7Days: [],
        topLocationsLast7Days: [],
      },
    });
  });

  it("should return default metrics when no data exists", async () => {
    // Mock collectionGroup (empty for both calls)
    mockGroupGet.mockResolvedValue(createMockSnapshot([]));

    // Mock metrics doc (not exists)
    mockGet.mockResolvedValue({
      exists: false,
      data: () => null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter456",
      { headers: { authorization: "Bearer test-token" } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      totalSearches: 0,
      totalProfileViews: 0,
      accessRequests: {
        pending: 0,
        approved: 0,
        denied: 0,
      },
      totalCandidatesInteracted: 0,
      lastActivityAt: null,
      searchBreakdown: {
        searchesLast24h: 0,
        searchesLast7Days: 0,
        uniqueCandidatesLast7Days: 0,
        topSkillsLast7Days: [],
        topLocationsLast7Days: [],
      },
    });
  });

  it("should return 400 when userId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics",
      { headers: { authorization: "Bearer test-token" } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "userId is required" });
  });

  it("should return 200 with partial data when access requests query fails", async () => {
    mockGroupGet.mockRejectedValue(new Error("Database connection failed"));

    // Mock metrics doc (still works)
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        totalSearches: 5,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter789",
      { headers: { authorization: "Bearer test-token" } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessRequests).toEqual({
      pending: 0,
      approved: 0,
      denied: 0,
    });
    expect(data.totalSearches).toBe(5);
  });

  it("should filter out expired approved requests", async () => {
    // Mock collectionGroup for access requests (first call)
    mockGroupGet.mockResolvedValueOnce(createMockSnapshot([]));

    // Mock collectionGroup for access grants (second call)
    mockGroupGet.mockResolvedValueOnce(
      createMockSnapshot([
        { expiresAt: new Date(Date.now() - 1000) }, // expired
        { expiresAt: new Date(Date.now() + 86400000) }, // active
      ])
    );

    // Mock metrics doc
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        totalSearches: 5,
        totalProfileViews: 10,
        totalCandidatesInteracted: 2,
        lastActivityAt: null,
        accessRequests: {
          pending: 0,
          approved: 1, // Only 1 active
          denied: 0,
        },
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter123",
      { headers: { authorization: "Bearer test-token" } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessRequests.approved).toBe(1); // Only the non-expired one
  });
});
