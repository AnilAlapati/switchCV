import { POST } from "@/app/api/profiles/request-access/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { normalizeDuration } from "@/lib/accessDuration";
import { getRecruiterContactLimits } from "@/lib/config.server";
import { createNotification } from "@/lib/notificationService";
import { updateRecruiterAccessMetric } from "@/lib/services/metricsService";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    collectionGroup: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    where: jest.fn().mockReturnThis(),
    add: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/accessDuration");
jest.mock("@/lib/config.server");
jest.mock("@/lib/notificationService");
jest.mock("@/lib/services/metricsService");

describe("Profiles Request Access API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeDuration as jest.Mock).mockReturnValue({
      label: "1 day",
      value: 1,
    });
    (getRecruiterContactLimits as jest.Mock).mockResolvedValue({
      basic: { amount: 2, interval: "month" },
      premium: { amount: 50, interval: "month" },
      enterprise: { amount: 9999, interval: "month" },
    });
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if resumeId or duration is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1" }), // Missing duration
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 403 if company name is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => ({}),
    }); // No company

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 403 if limit exceeded", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "basic" }),
      }) // User
      .mockResolvedValueOnce({ size: 2 }); // Requests (limit is 2)

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 404 if resume not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({ exists: false }); // Resume

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("should return 400 if requesting own resume", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-1" }),
      }); // Resume

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 409 if already has active grant", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({ empty: true, docs: [] }) // Existing requests
      .mockResolvedValueOnce({ docs: [{ data: () => ({ expiresAt: null }) }] }); // Active grant

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it("should return 409 if already has pending request", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ status: "pending" }) }],
      }) // Existing requests
      .mockResolvedValueOnce({ docs: [] }); // No grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it("should create request successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({ empty: true, docs: [] }) // Existing requests
      .mockResolvedValueOnce({ docs: [] }); // No grants
    (adminDb.add as jest.Mock).mockResolvedValue({ id: "req-1" });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "res-1",
          duration: "1day",
          message: "Hi",
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(createNotification).toHaveBeenCalled();
    expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(
      "user-1",
      "pending",
      1
    );
  });

  it("should handle Firestore index error and fallback", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "Acme", subscriptionTier: "enterprise" }),
      }) // User
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockRejectedValueOnce({ code: 9, message: "FAILED_PRECONDITION" }) // Existing requests (fail)
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ fromUserId: "user-1", status: "pending" }) }],
      }) // Fallback
      .mockResolvedValueOnce({ docs: [] }); // No grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(409); // Should find the pending request in fallback
  });

  it("should handle errors in POST", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ resumeId: "res-1", duration: "1day" }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
