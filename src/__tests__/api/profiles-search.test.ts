import { POST } from "@/app/api/profiles/search/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import * as searchQuery from "@/app/api/profiles/search/search-query";
import * as searchUtils from "@/app/api/profiles/search/search-utils";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/utils/distributedRateLimit");
jest.mock("@/app/api/profiles/search/search-query");
jest.mock("@/app/api/profiles/search/search-utils");

describe("Profiles Search API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      skills: [],
    });
    (searchQuery.matchesAllFilters as jest.Mock).mockReturnValue(true);
    (searchUtils.mapProfileResult as jest.Mock).mockImplementation(
      (id, data) => ({ id, ...data })
    );
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 429 if rate limited", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      resetIn: 1000,
      limit: 30,
      remaining: 0,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(429);
  });

  it("should return 400 if no query or filters", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      skills: [],
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should search by slug successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      slug: "test-slug",
      skills: [],
    });
    (adminDb.get as jest.Mock).mockResolvedValue({
      docs: [{ id: "user-1", data: () => ({ displayName: "Test User" }) }],
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ filters: { slug: "test-slug" } }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].displayName).toBe("Test User");
  });

  it("should search with filters and pagination", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      role: "Developer",
      location: "NY",
      skills: ["React"],
    });

    (adminDb.get as jest.Mock).mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { id: "u1", data: () => ({ displayName: "User 1" }) },
        { id: "u2", data: () => ({ displayName: "User 2" }) },
      ],
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({
          query: "test",
          filters: { role: "Developer" },
          limit: 2,
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(adminDb.where).toHaveBeenCalledWith(
      "publicProfile.role",
      "==",
      "Developer"
    );
    expect(adminDb.where).toHaveBeenCalledWith(
      "publicProfile.location",
      "==",
      "NY"
    );
    expect(adminDb.where).toHaveBeenCalledWith(
      "publicProfile.skills",
      "array-contains",
      "React"
    );
  });

  it("should handle multiple skills with array-contains-any", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      skills: ["React", "Node"],
    });

    (adminDb.get as jest.Mock).mockResolvedValue({ empty: true });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ query: "test" }),
      }
    );
    await POST(req);

    expect(adminDb.where).toHaveBeenCalledWith(
      "publicProfile.skills",
      "array-contains-any",
      ["React", "Node"]
    );
  });

  it("should handle cursor pagination", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({ exists: true }) // Cursor doc
      .mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [{ id: "u2", data: () => ({ displayName: "User 2" }) }],
      }); // Search results

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ query: "test", cursor: "u1" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(adminDb.startAfter).toHaveBeenCalled();
  });

  it("should handle empty results", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({ empty: true });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ query: "test" }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(0);
  });

  it("should search by direct ID successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    const mockId = "a".repeat(20);
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      id: mockId,
      data: () => ({
        publicProfile: { visible: true },
        displayName: "Direct User",
      }),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ query: mockId }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].displayName).toBe("Direct User");
  });

  it("should break loop when desiredResultCount is reached", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      skills: [],
    });

    (adminDb.get as jest.Mock).mockResolvedValue({
      empty: false,
      size: 5,
      docs: Array(5)
        .fill(0)
        .map((_, i) => ({
          id: `u${i}`,
          data: () => ({ displayName: `User ${i}` }),
        })),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({
          query: "test",
          limit: 2,
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
  });

  it("should skip documents that do not match all filters", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (searchQuery.buildNormalizedFilters as jest.Mock).mockReturnValue({
      skills: [],
    });

    // Mock matchesAllFilters to return false for the first doc, true for the second
    (searchQuery.matchesAllFilters as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    (adminDb.get as jest.Mock).mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { id: "u1", data: () => ({ displayName: "User 1" }) },
        { id: "u2", data: () => ({ displayName: "User 2" }) },
      ],
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({
          query: "test",
          limit: 1,
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe("u2");
  });

  it("should handle errors in POST", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/search"),
      {
        method: "POST",
        body: JSON.stringify({ query: "test" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
