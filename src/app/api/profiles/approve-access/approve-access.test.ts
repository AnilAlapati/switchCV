/**
 * Tests for /api/profiles/approve-access route
 */

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    increment: jest.fn((n) => n),
  },
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn((name) => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock AccessService
jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    respondToRequest: jest.fn(),
  },
}));

import { AccessService } from "@/lib/services/accessService";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

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



describe("POST /api/profiles/approve-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "owner-123",
    });
  });

  const basePayload = {
    requestId: "request-123",
    resumeId: "resume-123",
    duration: "1week" as const,
  };

  it("approves access and creates grant", async () => {
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(AccessService.respondToRequest).toHaveBeenCalledWith(
      "owner-123",
      "resume-123",
      "request-123",
      "approve",
      7
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
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(
      new Error("not found")
    );

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(404);
  });

  it("returns 403 if current user is not owner", async () => {
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(403);
  });

  it("returns 404 if access request missing", async () => {
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(
      new Error("not found")
    );

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(404);
  });

  it("handles forever duration without expiry", async () => {
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue(undefined);

    await POST(buildRequest({ ...basePayload, duration: "forever" }));

    expect(AccessService.respondToRequest).toHaveBeenCalledWith(
      "owner-123",
      "resume-123",
      "request-123",
      "approve",
      3650
    );
  });

  it("creates notification for requester", async () => {
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue(undefined);

    await POST(buildRequest(basePayload));

    expect(AccessService.respondToRequest).toHaveBeenCalledWith(
      "owner-123",
      "resume-123",
      "request-123",
      "approve",
      7
    );
  });

  it("handles errors gracefully", async () => {
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(
      new Error("Unexpected error")
    );

    const response = await POST(buildRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to approve access");
  });
});
