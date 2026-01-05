// eslint-disable-next-line no-restricted-imports
import type { FirebaseFirestore } from "firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier, getUserRole } from "@/lib/services/userService";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";

const mockCollection = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
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
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/services/quotaService", () => {
  const actual = jest.requireActual("@/lib/services/quotaService");
  return {
    ...actual,
    consumeQuota: jest.fn(),
  };
});

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;
const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>;
const mockConsumeQuota = consumeQuota as jest.MockedFunction<
  typeof consumeQuota
>;

interface MockDoc {
  id: string;
  data(): Record<string, any>;
  exists?: boolean;
}

const createMockDoc = (id: string, data: Record<string, any>): MockDoc => ({
  id,
  data: () => data,
  exists: true,
});

const createSnapshot = (docs: MockDoc[]) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
});

function valueAtPath(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((value, key) => value?.[key], obj);
}

function createCollectionMock(initialDocs: MockDoc[]) {
  let docs = [...initialDocs];
  let limitValue: number | null = null;

  const chain: any = {
    where: jest.fn(
      (field: string, op: FirebaseFirestore.WhereFilterOp, val) => {
        if (op !== "==") {
          throw new Error(`Unsupported operator: ${op}`);
        }
        docs = docs.filter((doc) => valueAtPath(doc.data(), field) === val);
        return chain;
      }
    ),
    orderBy: jest.fn(() => chain),
    limit: jest.fn((val: number) => {
      limitValue = val;
      return chain;
    }),
    get: jest.fn(async () => {
      const items = limitValue !== null ? docs.slice(0, limitValue) : docs;
      return createSnapshot(items);
    }),
    doc: jest.fn((docId: string) => ({
      get: jest.fn(async () => {
        const doc = docs.find((d) => d.id === docId);
        if (!doc) {
          return { exists: false, data: () => undefined };
        }
        return { exists: true, data: doc.data };
      }),
    })),
  };

  return chain;
}

function setupAdminDbCollections({
  resumes = [],
  users = [],
}: {
  resumes?: MockDoc[];
  users?: MockDoc[];
}) {
  mockCollection.mockImplementation((collectionName: string) => {
    if (collectionName === "resumes") {
      return createCollectionMock(resumes);
    }
    if (collectionName === "users") {
      return createCollectionMock(users);
    }
    throw new Error(`Unexpected collection: ${collectionName}`);
  });
}

describe("GET /api/recruiter/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "recruiter-123",
    });
    mockGetUserTier.mockResolvedValue("basic");
    mockGetUserRole.mockResolvedValue("recruiter");
    mockConsumeQuota.mockResolvedValue({
      remaining: 1,
      limit: 2,
      resetTime: Date.now(),
      count: 1,
    });
    setupAdminDbCollections({ resumes: [], users: [] });
  });

  it("requires a query parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query is required");
  });

  it("rejects non-recruiter roles", async () => {
    mockGetUserRole.mockResolvedValueOnce("jobseeker");

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=test"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Recruiter role required");
  });

  it("searches resumes and enriches with user info", async () => {
    const resumeDoc = createMockDoc("resume-123", {
      title: "Software Engineer",
      userId: "user-1",
      published: true,
      createdAt: "2024-01-01T00:00:00Z",
      skills: [{ name: "React" }, { name: "TypeScript" }],
    });

    const userDoc = createMockDoc("user-1", {
      uid: "user-1",
      displayName: "Jane Developer",
      email: "jane@example.com",
    });

    setupAdminDbCollections({ resumes: [resumeDoc], users: [userDoc] });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=Engineer"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual(
      expect.objectContaining({
        resumeId: "resume-123",
        title: "Software Engineer",
        userName: "Jane Developer",
        userId: "user-1",
        skills: ["React", "TypeScript"],
      })
    );
  });

  it("falls back to user search when no resumes match", async () => {
    const userDoc = createMockDoc("user-2", {
      uid: "user-2",
      displayName: "John Analyst",
      email: "john@example.com",
      publicProfile: { visible: true },
    });

    const resumeDoc = createMockDoc("resume-456", {
      title: "Analyst Resume",
      userId: "user-2",
      published: true,
      createdAt: "2024-02-01T00:00:00Z",
      skills: [{ name: "SQL" }],
    });

    setupAdminDbCollections({
      resumes: [resumeDoc],
      users: [userDoc],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=john"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].userName).toBe("John Analyst");
  });

  it("handles user lookup failures gracefully", async () => {
    const resumeDoc = createMockDoc("resume-789", {
      title: "QA Engineer",
      userId: "user-3",
      published: true,
      createdAt: "2024-03-01T00:00:00Z",
    });

    setupAdminDbCollections({ resumes: [resumeDoc], users: [] });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=qa"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].userName).toBe("Unknown User");
  });

  it("limits results based on query match", async () => {
    const resumeDocs = Array.from({ length: 60 }, (_, i) =>
      createMockDoc(`resume-${i}`, {
        title: `Resume ${i}`,
        userId: `user-${i}`,
        published: true,
        createdAt: "2024-04-01T00:00:00Z",
        skills: [],
      })
    );

    setupAdminDbCollections({ resumes: resumeDocs, users: [] });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=resume"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Results limited by Firebase query limit (50) then by config MAX_RESULTS (50)
    // But mock only returns 10 items by default
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(50);
  });

  it("enforces quota limits", async () => {
    const quotaError = new QuotaExceededError("limit");
    mockConsumeQuota.mockRejectedValueOnce(quotaError);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search?q=engineer"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("monthly search limit");
  });

  it("returns 401 when authentication fails", async () => {
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
});
