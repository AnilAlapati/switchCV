import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection-ref"),
  query: jest.fn(() => "mock-query-ref"),
  where: jest.fn(() => "mock-where-ref"),
  getDocs: jest.fn(),
  orderBy: jest.fn(() => "mock-orderBy-ref"),
  limit: jest.fn(() => "mock-limit-ref"),
}));

jest.mock("@/lib/utils/api-helpers", () => {
  const actual = jest.requireActual("@/lib/utils/api-helpers");
  return {
    ...actual,
    getAuthenticatedUserId: jest.fn(),
  };
});

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/services/quotaService", () => {
  const actual = jest.requireActual("@/lib/services/quotaService");
  return {
    ...actual,
    consumeQuota: jest.fn(),
  };
});

import { getDocs } from "firebase/firestore";

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;
const mockConsumeQuota = consumeQuota as jest.MockedFunction<
  typeof consumeQuota
>;

// Helper to create mock QueryDocumentSnapshot
const createMockDoc = (id: string, data: any) => ({
  id,
  data: () => data,
  exists: true,
  metadata: { hasPendingWrites: false, fromCache: false, isEqual: jest.fn() },
  ref: {},
  get: (field: string) => data[field],
  toJSON: () => ({ ...data, id }),
});

// Helper to create mock QuerySnapshot
const createMockSnapshot = (docs: any[]) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
  metadata: { hasPendingWrites: false, fromCache: false, isEqual: jest.fn() },
  query: {},
  forEach: (callback: (doc: any) => void) => docs.forEach(callback),
  docChanges: () => [],
  toJSON: () => ({
    docs: docs.map((doc) => doc.toJSON()),
    empty: docs.length === 0,
  }),
});

describe("GET /api/recruiter/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "recruiter-123",
    });
    mockGetUserTier.mockResolvedValue("basic");
    mockConsumeQuota.mockResolvedValue({
      remaining: 1,
      limit: 2,
      resetTime: Date.now(),
      count: 1,
    });
  });

  it("should return 400 when search query is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query is required");
  });

  it("should return 400 when search query is empty", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q="
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query is required");
  });

  it("should search resumes by title successfully", async () => {
    const mockResumeDoc = createMockDoc("resume-123456", {
      title: "Software Engineer Resume",
      userId: "user-123",
      published: true,
      createdAt: "2024-01-15T10:00:00Z",
      skills: [{ name: "JavaScript" }, { name: "React" }],
    });

    const mockUserDoc = createMockDoc("user-123", {
      uid: "user-123",
      displayName: "John Doe",
      email: "john@example.com",
    });

    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([mockResumeDoc]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserDoc]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=engineer"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual({
      resumeId: "resume-123456",
      title: "Software Engineer Resume",
      userName: "John Doe",
      userId: "user-123",
      createdAt: "2024-01-15T10:00:00Z",
      skills: ["JavaScript", "React"],
    });
    expect(data.count).toBe(1);
    expect(data.query).toBe("engineer");
  });

  it("should require authentication", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    mockGetAuthenticatedUserId.mockResolvedValueOnce({
      error: unauthorized,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=test"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(mockConsumeQuota).not.toHaveBeenCalled();
  });

  it("should search resumes by skills", async () => {
    const mockResumeDoc = createMockDoc("resume-789012", {
      title: "Frontend Developer",
      userId: "user-456",
      published: true,
      createdAt: "2024-01-20T10:00:00Z",
      skills: [{ name: "React" }, { name: "TypeScript" }, { name: "Node.js" }],
    });

    const mockUserDoc = createMockDoc("user-456", {
      uid: "user-456",
      displayName: "Jane Smith",
      email: "jane@example.com",
    });

    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([mockResumeDoc]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserDoc]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=typescript"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].skills).toContain("TypeScript");
  });

  it("should search resumes by ID prefix", async () => {
    const mockResumeDoc = createMockDoc("abc123def456", {
      title: "Data Scientist",
      userId: "user-789",
      published: true,
      createdAt: "2024-01-25T10:00:00Z",
      skills: [{ name: "Python" }, { name: "Machine Learning" }],
    });

    const mockUserDoc = createMockDoc("user-789", {
      uid: "user-789",
      displayName: "Bob Johnson",
      email: "bob@example.com",
    });

    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([mockResumeDoc]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserDoc]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=abc123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].resumeId).toBe("abc123def456");
  });

  it("should fallback to user search when no resume matches found", async () => {
    // User search returns a user
    const mockUserDoc = createMockDoc("user-999", {
      uid: "user-999",
      displayName: "Alice Developer",
      email: "alice@example.com",
      publicProfile: { visible: true },
    });

    // User's resumes
    const mockUserResumeDoc = createMockDoc("resume-999999", {
      title: "Full Stack Developer",
      userId: "user-999",
      published: true,
      createdAt: "2024-02-01T10:00:00Z",
      skills: [{ name: "JavaScript" }, { name: "Python" }],
    });

    // First call returns no resumes
    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserDoc]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserResumeDoc]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=alice"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].userName).toBe("Alice Developer");
  });

  it("should handle user fetch error gracefully", async () => {
    const mockResumeDoc = createMockDoc("resume-555666", {
      title: "Backend Engineer",
      userId: "user-555",
      published: true,
      createdAt: "2024-02-05T10:00:00Z",
      skills: [{ name: "Node.js" }, { name: "MongoDB" }],
    });

    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([mockResumeDoc]) as any)
      .mockRejectedValueOnce(new Error("Database connection error"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=backend"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].userName).toBe("Unknown User");
  });

  it("should return empty results for no matches", async () => {
    mockGetDocs.mockResolvedValue(createMockSnapshot([]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=nonexistent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
    expect(data.count).toBe(0);
  });

  it("should handle database errors", async () => {
    mockGetDocs.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=test"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Search failed");
  });

  it("should limit results to 20", async () => {
    const mockResumeDocs = Array.from({ length: 25 }, (_, i) =>
      createMockDoc(`resume-${i.toString().padStart(6, "0")}`, {
        title: `Resume ${i}`,
        userId: `user-${i}`,
        published: true,
        createdAt: "2024-01-15T10:00:00Z",
        skills: [{ name: "JavaScript" }],
      })
    );

    const mockUserDocs = Array.from({ length: 25 }, (_, i) =>
      createMockDoc(`user-${i}`, {
        uid: `user-${i}`,
        displayName: `User ${i}`,
        email: `user${i}@example.com`,
      })
    );

    mockGetDocs.mockResolvedValueOnce(
      createMockSnapshot(mockResumeDocs) as any
    );

    // Mock user fetches
    for (let i = 0; i < 25; i++) {
      mockGetDocs.mockResolvedValueOnce(
        createMockSnapshot([mockUserDocs[i]]) as any
      );
    }

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=javascript"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(20);
    expect(data.count).toBe(25);
  });

  it("should handle resume without skills", async () => {
    const mockResumeDoc = createMockDoc("resume-777888", {
      title: "DevOps Engineer",
      userId: "user-777",
      published: true,
      createdAt: "2024-02-10T10:00:00Z",
      // No skills field
    });

    const mockUserDoc = createMockDoc("user-777", {
      uid: "user-777",
      displayName: "Charlie Brown",
      email: "charlie@example.com",
    });

    mockGetDocs
      .mockResolvedValueOnce(createMockSnapshot([mockResumeDoc]) as any)
      .mockResolvedValueOnce(createMockSnapshot([mockUserDoc]) as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=devops"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].skills).toEqual([]);
  });

  it("should enforce search quota limits", async () => {
    const quotaError = new QuotaExceededError("limit");
    mockConsumeQuota.mockRejectedValueOnce(quotaError);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=engineer"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("monthly search limit");
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});
