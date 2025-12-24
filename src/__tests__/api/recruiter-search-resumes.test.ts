import { NextRequest } from "next/server";
import { POST } from "@/app/api/recruiter/search-resumes/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserRole, getUserTier } from "@/lib/services/userService";
import { getConstants } from "@/lib/getSystemConfig";
import { createDistributedRateLimiter } from "@/lib/utils/distributedRateLimit";
import { recordRecruiterSearchEvent } from "@/lib/recruiterSearchHistory";
import { getDocumentIdFromResumeId } from "@/lib/resumeIdMapping";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    getAll: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  ...jest.requireActual("@/lib/utils/api-helpers"),
  getAuthenticatedUserId: jest.fn(),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn(),
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/getSystemConfig", () => ({
  getConstants: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  createDistributedRateLimiter: jest.fn(),
}));

jest.mock("@/lib/recruiterSearchHistory", () => ({
  recordRecruiterSearchEvent: jest.fn(),
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  getDocumentIdFromResumeId: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn((v) => ({ type: "increment", value: v })),
    serverTimestamp: jest.fn(() => "mock-timestamp"),
  },
}));

describe("Recruiter Search Resumes API", () => {
  const mockRecruiterId = "recruiter-123";
  const mockAdminId = "admin-456";

  beforeEach(() => {
    jest.clearAllMocks();
    (getConstants as jest.Mock).mockResolvedValue({
      RATE_LIMITS: {
        SEARCH_REQUESTS_PER_MINUTE: 10,
      },
    });
    (createDistributedRateLimiter as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue({ allowed: true })
    );
  });

  it("should return 401 if unauthorized", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401 },
    });

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 if not a recruiter or admin", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "jobseeker-1",
    });
    (getUserRole as jest.Mock).mockResolvedValue("jobseeker");

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 429 if rate limited", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (createDistributedRateLimiter as jest.Mock).mockReturnValue(
      jest
        .fn()
        .mockResolvedValue({
          allowed: false,
          limit: 10,
          remaining: 0,
          reset: Date.now() + 60000,
        })
    );

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("should perform basic search by userId", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getUserTier as jest.Mock).mockResolvedValue("premium");

    // Mock metrics update
    const mockMetricsDoc = { set: jest.fn().mockResolvedValue({}) };
    (adminDb.collection as jest.Mock).mockImplementation((name) => {
      if (name === "recruiterMetrics") return { doc: () => mockMetricsDoc };
      return {
        doc: jest.fn().mockReturnThis(),
        get: jest.fn(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
    });

    // Mock access status map (collectionGroup)
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        forEach: jest.fn(),
        docs: [],
        empty: true,
      }),
    });

    // Mock performBasicSearch logic
    (getDocumentIdFromResumeId as jest.Mock).mockResolvedValue({
      documentId: "resume-doc-1",
      userId: "user-1",
    });

    const mockResumeData = {
      published: true,
      title: "Software Engineer",
      userId: "user-1",
    };
    const mockUserData = { displayName: "John Doe", email: "john@example.com" };

    (adminDb.collection as jest.Mock).mockImplementation((name) => {
      if (name === "recruiterMetrics") return { doc: () => mockMetricsDoc };
      if (name === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => mockResumeData,
              id: "resume-doc-1",
            }),
            collection: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        };
      }
      if (name === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => mockUserData,
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
      }
    );

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].userName).toBe("John Doe");
    expect(recordRecruiterSearchEvent).toHaveBeenCalled();
  });

  it("should perform premium search by skills and location", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getUserTier as jest.Mock).mockResolvedValue("premium");

    // Mock metrics update
    const mockMetricsDoc = { set: jest.fn().mockResolvedValue({}) };

    // Mock resumes for premium search
    const mockResumeDoc = {
      id: "resume-1",
      data: () => ({
        userId: "user-1",
        published: true,
        skills: ["React", "Node.js"],
        location: "New York",
        title: "Fullstack Dev",
      }),
    };

    const mockUserDoc = {
      id: "user-1",
      exists: true,
      data: () => ({
        displayName: "Jane Smith",
        location: "New York",
      }),
    };

    (adminDb.collection as jest.Mock).mockImplementation((name) => {
      if (name === "recruiterMetrics") return { doc: () => mockMetricsDoc };
      if (name === "resumes") {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [mockResumeDoc],
          }),
          doc: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        };
      }
      if (name === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUserDoc),
          }),
        };
      }
      return {};
    });

    (adminDb.getAll as jest.Mock).mockResolvedValue([mockUserDoc]);
    (adminDb.collectionGroup as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        forEach: jest.fn(),
        docs: [],
        empty: true,
      }),
    });

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ skills: ["React"], location: "New York" }),
      }
    );

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].userName).toBe("Jane Smith");
  });

  it("should return 403 for premium search if on basic tier", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getUserTier as jest.Mock).mockResolvedValue("basic");

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ skills: ["React"] }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toContain(
      "Premium or enterprise subscription required"
    );
  });

  it("should return 400 if no valid search parameters", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getUserTier as jest.Mock).mockResolvedValue("premium");

    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        // Empty body or missing required fields
        body: JSON.stringify({}),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
