import { NextRequest } from "next/server";
import { POST, GET } from "./route";

// Mock Firebase Admin
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockWhere = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

// Create a chainable mock for adminDb
jest.mock("@/lib/firebase-admin", () => {
  const createMockQuery = () => {
    const query: any = {
      get: mockGet,
      where: (...args: any[]) => {
        mockWhere(...args);
        return query;
      },
      limit: () => query,
      orderBy: () => query,
    };
    return query;
  };

  return {
    adminDb: {
      collection: (name: string) => {
        mockCollection(name);
        return {
          doc: (id: string) => {
            mockDoc(id);
            return {
              get: mockGet,
            };
          },
          add: mockAdd,
          ...createMockQuery(),
        };
      },
    },
    adminAuth: {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "recruiter-123" }),
    },
  };
});

// Mock api-helpers to return authenticated user
jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { error: message, details: error?.message },
      { status }
    );
  }),
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "recruiter-123" }),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock getUserRole to return 'recruiter' by default
jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn().mockResolvedValue("recruiter"),
}));

describe("POST /api/recruiters/request-contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    // Override the mock to return auth error
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    const { NextResponse } = require("next/server");
    getAuthenticatedUserId.mockResolvedValueOnce({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
        }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 when recruiterId does not match authenticated user", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          recruiterId: "different-user", // Different from authenticated user
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          recruiterName: "Test Recruiter",
          recruiterEmail: "recruiter@test.com",
          companyName: "Test Co",
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("recruiterId must match authenticated user");
  });

  it("should return 400 for missing required fields", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          // Missing userId, resumeId, requestedFields
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should return 400 for invalid requested fields", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["invalidField"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid fields requested in payload");
  });

  it("should return 404 when resume does not exist", async () => {
    // Mock resume not found (both canonical and legacy lookups)
    mockGet.mockResolvedValueOnce({
      exists: false,
    }).mockResolvedValueOnce({
      exists: false,
    });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return 400 when resume does not belong to specified user", async () => {
    // Mock resume exists but belongs to different user
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: "different-user-123", // Different from payload.userId
        title: "Test Resume",
      }),
    });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume does not belong to specified user");
  });

  it("should return 409 when duplicate pending request exists", async () => {
    // Mock resume exists
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: "user-123",
          title: "Test Resume",
        }),
      })
      // Mock existing pending request found
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "existing-request-123" }],
      });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "You already have a pending request for this candidate"
    );
  });

  it("should successfully create contact request", async () => {
    // Mock resume exists
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-123", title: "Test Resume" }),
      })
      // Mock no existing pending requests
      .mockResolvedValueOnce({ empty: true, docs: [] })
      // Mock recruiter profile exists with premium tier
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          subscriptionTier: "premium",
          displayName: "John Recruiter",
          email: "john@company.com",
          companyName: "Tech Corp",
        }),
      });

    // Mock successful add
    mockAdd.mockResolvedValue({ id: "request-123" });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          recruiterName: "John Recruiter",
          recruiterEmail: "john@company.com",
          companyName: "Tech Corp",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email", "phone"],
          purpose: "Senior Developer Position",
          proposedDuration: "1week",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-123");
    expect(mockAdd).toHaveBeenCalledTimes(2); // request + notification
    expect(mockAdd.mock.calls[0][0]).not.toHaveProperty("userEmail");
    expect(mockAdd.mock.calls[0][0]).not.toHaveProperty("toUserEmail");
    expect(mockAdd.mock.calls[0][0]).not.toHaveProperty("candidateEmail");
  });

  it("should block basic recruiters who exceed free request limit", async () => {
    // Mock resume exists
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-123", title: "Test Resume" }),
      })
      // Mock no existing pending requests (duplicate check passes)
      .mockResolvedValueOnce({ empty: true, docs: [] })
      // Mock recruiter profile exists with basic tier
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          subscriptionTier: "basic",
          displayName: "John Recruiter",
          email: "john@company.com",
          companyName: "Tech Corp",
        }),
      })
      // Mock active requests count (exceeds limit)
      .mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [{ id: "req-1" }, { id: "req-2" }],
      });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          recruiterName: "John Recruiter",
          recruiterEmail: "john@company.com",
          companyName: "Tech Corp",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Free recruiter request limit reached. Upgrade for more.");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    // Mock database error
    mockGet.mockRejectedValueOnce(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create contact request");
    expect(data.details).toBe("Database connection failed");
  });

  it("should return 400 when recruiter tries to request their own contact info", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "recruiter-123", // Same as recruiterId
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Recruiters cannot request their own contact info");
  });
});

describe("GET /api/recruiters/request-contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    const { NextResponse } = require("next/server");
    getAuthenticatedUserId.mockResolvedValueOnce({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact?recruiterId=recruiter-123",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when recruiterId is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("recruiterId is required");
  });

  it("should return 403 when trying to view another user's requests", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact?recruiterId=different-user",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Can only view your own requests");
  });

  it("should successfully return recruiter's requests", async () => {
    // Mock requests snapshot
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "req-1",
          data: () => ({
            status: "pending",
            toUserId: "user-1",
            resumeId: "resume-1",
            userEmail: "candidate1@example.com",
          }),
        },
        {
          id: "req-2",
          data: () => ({
            status: "approved",
            toUserId: "user-2",
            resumeId: "resume-2",
            toUserEmail: "candidate2@example.com",
          }),
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact?recruiterId=recruiter-123",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recruiterId).toBe("recruiter-123");
    expect(data.requests).toHaveLength(2);
    expect(data.requests[0]).not.toHaveProperty("userEmail");
    expect(data.requests[0]).not.toHaveProperty("toUserEmail");
    expect(data.summary.pending).toBe(1);
    expect(data.summary.approved).toBe(1);
  });
});
