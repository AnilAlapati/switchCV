/**
 * Tests for /api/profiles/approve-access route
 */

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

import { POST } from "@/app/api/profiles/approve-access/route";
import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockAdminAuth = adminAuth as jest.Mocked<typeof adminAuth>;

const createDecodedToken = (uid: string) => ({
  uid,
  aud: "test-audience",
  auth_time: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  firebase: { identities: {}, sign_in_provider: "password" },
  iat: Date.now() / 1000,
  iss: "https://securetoken.google.com/test-project",
  sub: uid,
});

const buildRequest = (
  payload: unknown,
  token: string | null = "owner-token"
): NextRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return new NextRequest("http://localhost:3000/api/profiles/approve-access", {
    method: "POST",
    body: JSON.stringify(payload),
    headers,
  });
};

let resumeDocRef: any;
let requestDocRef: any;
let accessRequestsCollection: any;
let accessGrantsCollection: any;
let notificationsDocRef: any;
let messagesCollection: any;

const setupFirestoreMocks = () => {
  requestDocRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        fromUserId: "requester-123",
        fromUserName: "Requester",
        resumeSlug: "resume-slug",
      }),
    }),
    update: jest.fn().mockResolvedValue(undefined),
  };

  accessRequestsCollection = {
    doc: jest.fn(() => requestDocRef),
  };

  accessGrantsCollection = {
    add: jest.fn().mockResolvedValue({ id: "grant-123" }),
  };

  messagesCollection = {
    add: jest.fn().mockResolvedValue({ id: "notification-123" }),
  };

  notificationsDocRef = {
    collection: jest.fn(() => messagesCollection),
  };

  resumeDocRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", title: "Resume" }),
    }),
    collection: jest.fn((name: string) => {
      if (name === "accessRequests") {
        return accessRequestsCollection;
      }
      if (name === "accessGrants") {
        return accessGrantsCollection;
      }
      return null;
    }),
  };

  (mockAdminDb.collection as jest.Mock).mockImplementation((name: string) => {
    switch (name) {
      case "resumeProfiles":
        return { doc: jest.fn(() => resumeDocRef) };
      case "notifications":
        return { doc: jest.fn(() => notificationsDocRef) };
      default:
        return { doc: jest.fn() };
    }
  });
};

describe("POST /api/profiles/approve-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFirestoreMocks();
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createDecodedToken("owner-123")
    );
  });

  const basePayload = {
    requestId: "request-123",
    resumeId: "resume-123",
    duration: "1week" as const,
  };

  it("approves access and creates grant", async () => {
    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(accessGrantsCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({ grantedBy: "owner-123" })
    );
    expect(requestDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
    );
  });

  it("returns 401 when auth header missing", async () => {
    const response = await POST(buildRequest(basePayload, null));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when required fields missing", async () => {
    const response = await POST(buildRequest({ requestId: "only" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("rejects invalid duration", async () => {
    const response = await POST(
      buildRequest({ ...basePayload, duration: "invalid" as any })
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 if resume not found", async () => {
    resumeDocRef.get.mockResolvedValue({ exists: false });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(404);
  });

  it("returns 403 if current user is not owner", async () => {
    resumeDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "other-user" }),
    });

    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("returns 404 if access request missing", async () => {
    requestDocRef.get.mockResolvedValue({ exists: false });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(404);
  });

  it("handles forever duration without expiry", async () => {
    await POST(buildRequest({ ...basePayload, duration: "forever" }));

    const grantPayload = accessGrantsCollection.add.mock.calls[0][0];
    expect(grantPayload.expiresAt).toBeNull();
  });

  it("creates notification for requester", async () => {
    await POST(buildRequest(basePayload));

    expect(messagesCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "requester-123" })
    );
  });

  it("handles errors gracefully", async () => {
    resumeDocRef.get.mockRejectedValue(new Error("Firestore offline"));

    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to approve access");
  });
});
