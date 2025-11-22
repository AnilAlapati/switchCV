/**
 * Tests for /api/profiles/approve-access route
 */

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
  },
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status: status,
      json: async () => ({
        error: message,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }),
  verifyResumeOwnership: jest.fn(),
}));

import { POST } from "@/app/api/profiles/approve-access/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  verifyResumeOwnership,
  handleApiError,
} from "@/lib/utils/api-helpers";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "owner-123",
    });
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: true,
      userId: "owner-123",
      docRef: resumeDocRef,
      resumeData: { userId: "owner-123" },
    });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: handleApiError(new Error("Unauthorized"), "Unauthorized", 401),
    });
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
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: false,
      error: handleApiError(
        new Error("Resume not found"),
        "Resume not found",
        404
      ),
    });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(404);
  });

  it("returns 403 if current user is not owner", async () => {
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: false,
      error: handleApiError(
        new Error("Forbidden: You do not own this resume"),
        "Forbidden: You do not own this resume",
        403
      ),
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
    // Mock verifyResumeOwnership to throw or return success but subsequent calls fail
    // Here we want to test the try-catch block in the route
    requestDocRef.get.mockRejectedValue(new Error("Firestore offline"));

    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to approve access");
  });
});
