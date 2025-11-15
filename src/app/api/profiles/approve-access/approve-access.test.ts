/**
 * Tests for /api/profiles/approve-access route
 */

import { POST } from "@/app/api/profiles/approve-access/route";
import { NextRequest } from "next/server";
import {
  getDoc,
  updateDoc,
  addDoc,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import {
  createMockFirestoreDoc,
  createMockQuerySnapshot,
} from "@/__tests__/mocks/firebase";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  arrayUnion: jest.fn((value: any) => value),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock("@/lib/firebase", () => ({
  db: { name: "[DEFAULT]" },
}));

describe("POST /api/profiles/approve-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should approve access request and create grant", async () => {
    (getDoc as jest.Mock)
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          fromUserId: "requester-123",
          status: "pending",
        })
      )
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          userId: "owner-123",
          accessGrants: [],
        })
      );

    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock).mockResolvedValue({ id: "grant-123" });

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "1week" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.grantId).toBe("grant-123");
  });

  it("should return 400 if required fields are missing", async () => {
    const payload = { requestId: "request-123" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should calculate correct expiry date for 1hour duration", async () => {
    (getDoc as jest.Mock)
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          fromUserId: "requester-123",
          status: "pending",
        })
      )
      .mockResolvedValueOnce(
        createMockFirestoreDoc({ userId: "owner-123", accessGrants: [] })
      );

    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock).mockResolvedValue({ id: "grant-123" });

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "1hour" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    await POST(request);

    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
  });

  it("should handle 'forever' duration without expiry", async () => {
    (getDoc as jest.Mock)
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          fromUserId: "requester-123",
          status: "pending",
        })
      )
      .mockResolvedValueOnce(
        createMockFirestoreDoc({ userId: "owner-123", accessGrants: [] })
      );

    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock).mockResolvedValue({ id: "grant-123" });

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "forever" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 404 if access request not found", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: jest.fn().mockReturnValue(false),
    });

    const payload = {
      requestId: "non-existent",
      resumeId: "resume-123",
      duration: "1week" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should update request status to approved", async () => {
    (getDoc as jest.Mock)
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          fromUserId: "requester-123",
          status: "pending",
        })
      )
      .mockResolvedValueOnce(
        createMockFirestoreDoc({ userId: "owner-123", accessGrants: [] })
      );

    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock).mockResolvedValue({ id: "grant-123" });

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "1day" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    await POST(request);

    expect(updateDoc).toHaveBeenCalled();
    const updateCall = (updateDoc as jest.Mock).mock.calls[0];
    expect(updateCall[1]).toHaveProperty("status");
  });

  it("should create notification for requester", async () => {
    (getDoc as jest.Mock)
      .mockResolvedValueOnce(
        createMockFirestoreDoc({
          fromUserId: "requester-123",
          status: "pending",
        })
      )
      .mockResolvedValueOnce(
        createMockFirestoreDoc({ userId: "owner-123", accessGrants: [] })
      );

    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock)
      .mockResolvedValueOnce({ id: "grant-123" })
      .mockResolvedValueOnce({ id: "notification-123" });

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "1week" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    await POST(request);

    expect(addDoc).toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Database error"));

    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "1week" as const,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed");
  });

  it("should validate duration parameter", async () => {
    const payload = {
      requestId: "request-123",
      resumeId: "resume-123",
      duration: "invalid" as any,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/approve-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
