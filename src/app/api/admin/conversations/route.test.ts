import { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(
    (err, msg) => new Response(JSON.stringify({ error: msg }), { status: 500 }),
  ),
}));

jest.mock("@/lib/services/adminService", () => ({
  verifyAdminAccess: jest.fn(),
}));

jest.mock("@/lib/services/conversationStorageService", () => ({
  getConversationSessions: jest.fn(),
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { verifyAdminAccess } from "@/lib/services/adminService";
import { getConversationSessions } from "@/lib/services/conversationStorageService";

const mockGetAuth = getAuthenticatedUserId as jest.MockedFunction<
  typeof getAuthenticatedUserId
>;
const mockVerifyAdmin = verifyAdminAccess as jest.MockedFunction<
  typeof verifyAdminAccess
>;
const mockGetSessions = getConversationSessions as jest.MockedFunction<
  typeof getConversationSessions
>;

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/conversations");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/admin/conversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    mockGetAuth.mockResolvedValue({ userId: undefined, error: authError as never });

    const res = await GET(makeRequest({ userId: "user1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin accesses endpoint", async () => {
    mockGetAuth.mockResolvedValue({ userId: "admin1", error: undefined });
    mockVerifyAdmin.mockResolvedValue(false);

    const res = await GET(makeRequest({ userId: "user1" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when userId query param is missing", async () => {
    mockGetAuth.mockResolvedValue({ userId: "admin1", error: undefined });
    mockVerifyAdmin.mockResolvedValue(true);

    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid query params");
  });

  it("returns 400 when limit exceeds 100", async () => {
    mockGetAuth.mockResolvedValue({ userId: "admin1", error: undefined });
    mockVerifyAdmin.mockResolvedValue(true);

    const res = await GET(makeRequest({ userId: "user1", limit: "200" }));
    expect(res.status).toBe(400);
  });

  it("returns sessions for a valid admin request", async () => {
    mockGetAuth.mockResolvedValue({ userId: "admin1", error: undefined });
    mockVerifyAdmin.mockResolvedValue(true);
    const fakeSessions = [
      { sessionId: "s1", userId: "user1", createdAt: "2025-01-01T00:00:00Z" },
      { sessionId: "s2", userId: "user1", createdAt: "2025-01-02T00:00:00Z" },
    ];
    mockGetSessions.mockResolvedValue(fakeSessions as never);

    const res = await GET(makeRequest({ userId: "user1", limit: "10" }));
    expect(mockGetSessions).toHaveBeenCalledWith("user1", { limit: 10 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(2);
    expect(body.count).toBe(2);
  });

  it("uses default limit of 20 when not specified", async () => {
    mockGetAuth.mockResolvedValue({ userId: "admin1", error: undefined });
    mockVerifyAdmin.mockResolvedValue(true);
    mockGetSessions.mockResolvedValue([]);

    await GET(makeRequest({ userId: "user1" }));
    expect(mockGetSessions).toHaveBeenCalledWith("user1", { limit: 20 });
  });
});
