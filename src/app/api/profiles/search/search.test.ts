/**
 * Tests for /api/profiles/search route
 */

import { POST } from "@/app/api/profiles/search/route";
import { NextRequest } from "next/server";

// Mock Firebase Admin SDK with chainable methods
const mockGet = jest.fn();

// Create a chainable mock object
const createChainableMock = () => {
  const chainable: Record<string, jest.Mock> = {};

  const methods = ["where", "limit", "orderBy", "startAfter", "doc", "get"];

  methods.forEach((method) => {
    chainable[method] = jest.fn().mockImplementation(() => {
      if (method === "get") {
        return mockGet();
      }
      return chainable;
    });
  });

  return chainable;
};

const mockCollection = jest
  .fn()
  .mockImplementation(() => createChainableMock());

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "user-123" }),
  },
}));

// Mock api-helpers to return authenticated user
jest.mock("@/lib/utils/api-helpers", () => ({
  ...jest.requireActual("@/lib/utils/api-helpers"),
  validateCorsRequest: jest.fn(() => null),
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { error: message, details: error?.message },
      { status }
    );
  }),
  getAuthenticatedUserId: jest.fn().mockResolvedValue({ userId: "user-123" }),
}));

// Mock distributed rate limiter
jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 29,
    limit: 30,
    resetIn: 60000,
  }),
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

// Helper to create mock query snapshot
const createMockQuerySnapshot = (docs: any[]) => ({
  docs: docs.map((data, index) => ({
    id: data.uid || `doc-${index}`,
    data: () => data,
    exists: true,
  })),
  empty: docs.length === 0,
  size: docs.length,
});

describe("POST /api/profiles/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockGet to return empty by default
    mockGet.mockResolvedValue(createMockQuerySnapshot([]));
  });

  it("should return 401 if not authenticated", async () => {
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    const { NextResponse } = require("next/server");
    getAuthenticatedUserId.mockResolvedValueOnce({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const payload = { query: "developer" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 429 if rate limited", async () => {
    const {
      checkDistributedRateLimit,
    } = require("@/lib/utils/distributedRateLimit");
    checkDistributedRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 30,
      resetIn: 30000,
    });

    const payload = { query: "developer" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(429);
  });

  it("should return 400 if no query or filters provided", async () => {
    const payload = { query: "", filters: {} };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("search query or filters");
  });

  it("should search profiles by name query", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            headline: "Software Engineer",
          },
        },
        {
          uid: "user-2",
          displayName: "Jane Developer",
          publicProfile: {
            visible: true,
            headline: "Full Stack Developer",
          },
        },
      ])
    );

    const payload = {
      query: "developer",
      limit: 20,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should filter profiles by role", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            role: "Frontend Developer",
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { role: "Frontend Developer" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should filter profiles by location", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            location: "San Francisco, CA",
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { location: "San Francisco" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should filter profiles by skills", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            skills: ["React", "TypeScript", "Node.js"],
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { skills: ["React", "TypeScript"] },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should search by slug", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          profileSlug: "john-developer",
          publicProfile: { visible: true },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { slug: "john-developer" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should apply pagination with limit and offset", async () => {
    const mockDocs = Array.from({ length: 25 }, (_, i) => ({
      uid: `user-${i}`,
      displayName: `User ${i}`,
      publicProfile: { visible: true },
    }));

    mockGet.mockResolvedValue(createMockQuerySnapshot(mockDocs));

    const payload = {
      query: "user",
      limit: 10,
      offset: 5,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should handle empty search results", async () => {
    mockGet.mockResolvedValue(createMockQuerySnapshot([]));

    const payload = {
      query: "nonexistent",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should handle database errors gracefully", async () => {
    mockGet.mockRejectedValue(new Error("Database error"));

    const payload = {
      query: "developer",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it("should combine multiple filters", async () => {
    mockGet.mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            role: "Senior Developer",
            location: "San Francisco",
            skills: ["React", "Node.js"],
          },
        },
      ])
    );

    const payload = {
      query: "john",
      filters: {
        role: "Senior Developer",
        location: "San Francisco",
        skills: ["React"],
      },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
