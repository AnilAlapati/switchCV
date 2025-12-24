import { POST } from "@/app/api/profiles/approve-access/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  verifyResumeOwnership,
} from "@/lib/utils/api-helpers";

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
  verifyResumeOwnership: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Profiles Approve Access API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing fields", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({ requestId: "req-1" }), // Missing resumeId, duration
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 400 if invalid duration", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "invalid",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return error if ownership verification fails", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: false,
      error: { status: 403, json: async () => ({ error: "Forbidden" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "1day",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 404 if request not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    const mockDocRef = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false }),
    };
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: true,
      docRef: mockDocRef,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "1day",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("should approve access successfully for 1hour", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    const mockDocRef = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ fromUserId: "requester-1", fromUserName: "Requester" }),
      }),
      update: jest.fn().mockResolvedValue({}),
      add: jest.fn().mockResolvedValue({ id: "grant-1" }),
    };
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: true,
      docRef: mockDocRef,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "1hour",
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
    );
    expect(mockDocRef.add).toHaveBeenCalledWith(
      expect.objectContaining({ duration: "1hour" })
    );
  });

  it("should approve access successfully for forever", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    const mockDocRef = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ fromUserId: "requester-1", fromUserName: "Requester" }),
      }),
      update: jest.fn().mockResolvedValue({}),
      add: jest.fn().mockResolvedValue({ id: "grant-1" }),
    };
    (verifyResumeOwnership as jest.Mock).mockResolvedValue({
      success: true,
      docRef: mockDocRef,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "forever",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(mockDocRef.add).toHaveBeenCalledWith(
      expect.objectContaining({ duration: "forever", expiresAt: null })
    );
  });

  it("should handle errors in POST", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (verifyResumeOwnership as jest.Mock).mockRejectedValue(
      new Error("Verification error")
    );

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "1day",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
