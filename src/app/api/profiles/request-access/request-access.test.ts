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
  handleApiError: jest.fn((error, message, status = 500) => {
    return Response.json(
      { error: message, details: error?.message },
      { status }
    );
  }),
}));
jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    requestAccess: jest.fn(),
  },
}));

import { POST } from "@/app/api/profiles/request-access/route";
import { NextRequest } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

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
  // Keep minimal mocks if needed for other tests
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

    (AccessService.requestAccess as jest.Mock).mockResolvedValue({
      requestId: "request-123",
    });

    const response = await POST(buildRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(AccessService.requestAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: "requester-123",
        resumeId: "resume-123",
        message: "I'm interested in your resume",
      })
    );
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
    (AccessService.requestAccess as jest.Mock).mockRejectedValue(
      new Error("Resume not found")
    );

    const payload = { ...basePayload, resumeId: "non-existent" };

    const response = await POST(buildRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not found");
  });

  it("should return 400 if duration is missing", async () => {
    const response = await POST(buildRequest({ resumeId: "resume-1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Duration selection is required");
  });

  it("should return 400 if user requests their own resume", async () => {
    (AccessService.requestAccess as jest.Mock).mockRejectedValue(
      new Error("Cannot request access to own resume")
    );

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
    expect(data.error).toContain("Invalid duration selection");
  });

  it("should return 409 if pending request already exists", async () => {
    (AccessService.requestAccess as jest.Mock).mockRejectedValue(
      new Error("Pending request already exists")
    );

    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("Access already requested or granted");
  });

  it("should handle unexpected errors gracefully", async () => {
    (AccessService.requestAccess as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const response = await POST(
      buildRequest({ ...basePayload, resumeId: "resume-1" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create access request");
  });

  it("should include optional message in request", async () => {
    const message = "I think we'd be great colleagues!";

    (AccessService.requestAccess as jest.Mock).mockResolvedValue({
      requestId: "request-123",
    });

    await POST(buildRequest({ ...basePayload, resumeId: "resume-1", message }));

    expect(AccessService.requestAccess).toHaveBeenCalledWith(
      expect.objectContaining({ message })
    );
  });
});
