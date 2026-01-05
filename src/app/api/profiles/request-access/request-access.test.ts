/**
 * Tests for /api/profiles/request-access route
 */

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({ error: message, details: error?.message }),
  })),
}));
jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn(),
}));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => "mock-timestamp"),
    increment: jest.fn((n) => n),
  },
}));

import { createNotification } from "@/lib/notificationService";
import { POST } from "@/app/api/profiles/request-access/route";
import { NextRequest } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;

const buildRequest = (
  payload: unknown,
  token: string | null = "test-token"
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return new NextRequest("http://localhost:3000/api/profiles/request-access", {
    method: "POST",
    body: JSON.stringify(payload),
    headers,
  });
};

const mockQuerySnapshot = (docs: any[]) => ({
  empty: docs.length === 0,
  docs: docs.map((doc) => ({
    ...doc,
    data: () => doc,
  })),
});

let userDocRef: any;
let resumeDocRef: any;
let notificationsDocRef: any;
let accessRequestsCollection: any;
let accessGrantsCollection: any;
let messagesCollection: any;

const setupFirestoreMocks = () => {
  userDocRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ displayName: "Requesting User", company: "Test Company" }),
    }),
  };

  accessRequestsCollection = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockQuerySnapshot([])),
    add: jest.fn().mockResolvedValue({ id: "request-123" }),
  };

  accessGrantsCollection = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockQuerySnapshot([])),
  };

  messagesCollection = {
    add: jest.fn().mockResolvedValue({ id: "notification-123" }),
  };

  resumeDocRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", title: "My Resume" }),
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

  notificationsDocRef = {
    collection: jest.fn(() => messagesCollection),
  };

  (mockAdminDb.collection as jest.Mock).mockImplementation((name: string) => {
    switch (name) {
      case "users":
        return { doc: jest.fn(() => userDocRef) };
      case "resumes":
        return { doc: jest.fn(() => resumeDocRef) };
      case "notifications":
        return { doc: jest.fn(() => notificationsDocRef) };
      case "recruiterMetrics":
      case "jobSeekerMetrics":
        return {
          doc: jest.fn(() => ({
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      default:
        return { doc: jest.fn() };
    }
  });

  (mockAdminDb.collectionGroup as jest.Mock).mockImplementation(
    (name: string) => {
      if (name === "accessRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(mockQuerySnapshot([])),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockQuerySnapshot([])),
      };
    }
  );
};

describe("POST /api/profiles/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFirestoreMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "requester-123",
    });
  });

  const basePayload = {
    resumeId: "resume-123",
    duration: { preset: "1_week" as const },
  };

  it("should create access request successfully", async () => {
    const payload = {
      ...basePayload,
      message: "I'm interested in your resume",
    };

    const response = await POST(buildRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(accessRequestsCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({ fromUserId: "requester-123" })
    );
    expect(createNotification).toHaveBeenCalled();
  });

  it("should return 401 when missing auth header", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: {
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      },
    });
    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" }, null)
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if resumeId is missing", async () => {
    const payload = { message: "Test message", duration: basePayload.duration };

    const response = await POST(buildRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 404 if resume doesn't exist", async () => {
    resumeDocRef.get.mockResolvedValue({ exists: false });

    const payload = { ...basePayload, resumeId: "non-existent" };

    const response = await POST(buildRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return 400 if duration is missing", async () => {
    const response = await POST(buildRequest({ resumeId: "resume-1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Duration selection is required");
  });

  it("should return 400 if user requests their own resume", async () => {
    resumeDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "requester-123", title: "My Resume" }),
    });

    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("own resume");
  });

  it("should validate custom duration server-side", async () => {
    const response = await POST(
      buildRequest({
        resumeId: "resume-1",
        duration: { preset: "custom_days", customDays: 0 },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Custom duration");
  });

  it("should return 409 if pending request already exists", async () => {
    accessRequestsCollection.get.mockResolvedValue(
      mockQuerySnapshot([{ id: "existing", status: "pending" }])
    );

    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("pending request");
  });

  it("should handle unexpected errors gracefully", async () => {
    resumeDocRef.get.mockRejectedValue(new Error("Database error"));

    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create access request");
  });

  it("should create notification for resume owner", async () => {
    await POST(buildRequest({ ...basePayload, resumeId: "resume-1" }));

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      "owner-123",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("should include optional message in request", async () => {
    const message = "I think we'd be great colleagues!";

    await POST(buildRequest({ ...basePayload, resumeId: "resume-1", message }));

    expect(accessRequestsCollection.add).toHaveBeenCalled();
    const payloadArg = accessRequestsCollection.add.mock.calls[0][0];
    expect(payloadArg.message).toBe(message);
  });

  it("should persist normalized duration metadata", async () => {
    await POST(
      buildRequest({
        resumeId: "resume-1",
        duration: { preset: "custom_days", customDays: 5 },
        timezone: "America/New_York",
      })
    );

    const payloadArg = accessRequestsCollection.add.mock.calls[0][0];
    expect(payloadArg.requestedDuration).toMatchObject({
      preset: "custom_days",
      value: 5,
      label: "5 Days",
      timezone: "America/New_York",
    });
    expect(payloadArg.requestedDuration.durationHours).toBe(5 * 24);
    expect(payloadArg.requestedDuration.durationMs).toBeGreaterThan(0);
  });
});
