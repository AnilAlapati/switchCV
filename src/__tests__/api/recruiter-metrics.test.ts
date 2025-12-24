import { NextRequest } from "next/server";
import { GET } from "@/app/api/recruiter/metrics/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 }
    )
  ),
}));

jest.mock("@/lib/recruiterSearchHistory", () => ({
  getRecruiterSearchBreakdown: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Metrics API", () => {
  const mockUserId = "recruiter-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock user role check
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
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
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            totalSearches: 10,
            accessRequests: { pending: 1, approved: 2, denied: 0 },
          }),
        }),
        set: jest.fn().mockResolvedValue({}),
      };
    });

    (getRecruiterSearchBreakdown as jest.Mock).mockResolvedValue({
      "Software Engineer": 5,
    });
  });

  it("should fetch recruiter metrics", async () => {
    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=${mockUserId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSearches).toBe(10);
    expect(data.accessRequests.pending).toBe(1);
  });

  it("should perform lazy migration if accessRequests are missing", async () => {
    // Mock metrics missing accessRequests
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter" }),
            }),
          }),
        };
      }
      if (col === "recruiterMetrics") {
        return {
          doc: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ totalSearches: 10 }), // Missing accessRequests
          }),
          set: jest.fn().mockResolvedValue({}),
        };
      }
      return {};
    });

    // Mock collectionGroup queries
    (adminDb.collectionGroup as jest.Mock).mockImplementation((col) => {
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: (cb: any) => {
            if (col === "accessRequests") {
              cb({ data: () => ({ status: "pending" }) });
            } else if (col === "accessGrants") {
              cb({ data: () => ({ expiresAt: null }) });
            }
          },
        }),
      };
    });

    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=${mockUserId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessRequests.pending).toBe(1);
    expect(data.accessRequests.approved).toBe(1);
  });

  it("should return 403 if accessing another user's metrics", async () => {
    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=other-user`
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should allow admin to access any user's metrics", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          }),
        };
      }
      return {
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ totalSearches: 10 }),
        }),
      };
    });

    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=other-user`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should return 400 if userId is missing", async () => {
    const req = new NextRequest(`http://localhost/api/recruiter/metrics`);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
