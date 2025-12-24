import { POST } from "@/app/api/profiles/respond-access/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { normalizeDuration } from "@/lib/accessDuration";
import { createNotification } from "@/lib/notificationService";
import {
  decrementJobSeekerMetric,
  updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";
import { Timestamp } from "firebase-admin/firestore";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn(),
    add: jest.fn(),
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
jest.mock("@/lib/notificationService");
jest.mock("@/lib/services/metricsService");

describe("Profiles Respond Access API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeDuration as jest.Mock).mockReturnValue({
      label: "1 week",
      durationMs: 604800000,
    });
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if invalid request", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "invalid",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 403 if not owner", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => ({ userId: "other-user" }),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 404 if request not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-1" }),
      }) // Resume
      .mockResolvedValueOnce({ exists: false }); // Request

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("should approve access successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-1", title: "My Resume" }),
      }) // Resume
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ fromUserId: "recruiter-1" }),
      }); // Request
    (adminDb.update as jest.Mock).mockResolvedValue({});
    (adminDb.add as jest.Mock).mockResolvedValue({ id: "grant-1" });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(adminDb.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
    );
    expect(createNotification).toHaveBeenCalled();
    expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(
      "recruiter-1",
      "approved",
      1
    );
  });

  it("should deny access successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ fromUserId: "recruiter-1" }),
      }); // Request
    (adminDb.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "deny",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(adminDb.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "denied" })
    );
    expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(
      "recruiter-1",
      "denied",
      1
    );
  });

  it("should return 400 if grant duration is longer than requested", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fromUserId: "recruiter-1",
          requestedDuration: { durationMs: 1000 },
        }),
      }); // Request
    (normalizeDuration as jest.Mock).mockReturnValue({
      label: "1 week",
      durationMs: 604800000,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
          grantDuration: { preset: "1_week" },
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should handle errors in POST", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
