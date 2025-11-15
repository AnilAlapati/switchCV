/**
 * Tests for /api/profiles/request-access route
 */

import { POST } from "@/app/api/profiles/request-access/route";
import { NextRequest } from "next/server";
import { getDoc, addDoc, getDocs, collection, doc } from "firebase/firestore";
import {
  createMockFirestoreDoc,
  createMockQuerySnapshot,
} from "@/__tests__/mocks/firebase";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: "serverTimestamp" })),
}));

jest.mock("@/lib/firebase", () => ({
  db: { name: "[DEFAULT]" },
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

describe("POST /api/profiles/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (doc as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
  });

  it("should create access request successfully", async () => {
    // Setup mocks
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({ userId: "owner-user-123", title: "My Resume" })
    );
    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot([]));
    (addDoc as jest.Mock).mockResolvedValue({ id: "request-123" });

    const payload = {
      resumeId: "resume-123",
      message: "I'm interested in your resume",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-123");
    expect(data.message).toContain("Request sent");
  });

  it("should return 400 if resumeId is missing", async () => {
    const payload = { message: "Test message" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 404 if resume doesn't exist", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({}, "not-found")
    );
    // Set exists() to return false
    (getDoc as jest.Mock).mockResolvedValue({
      exists: jest.fn().mockReturnValue(false),
      data: jest.fn().mockReturnValue(null),
    });

    const payload = { resumeId: "non-existent" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return 400 if user tries to request their own resume", async () => {
    const userId = "placeholder-uid"; // Must match hardcoded currentUserId in route

    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({ userId, title: "My Resume" })
    );

    const payload = { resumeId: "resume-123" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Cannot request access to your own resume");
  });

  it("should return 409 if pending request already exists", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({ userId: "owner-123", title: "My Resume" })
    );

    // Mock existing pending request
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([{ status: "pending" }])
    );

    const payload = { resumeId: "resume-123" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("already have a pending request");
  });

  it("should handle errors gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Database error"));

    const payload = { resumeId: "resume-123" };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create access request");
  });

  it("should create notification for resume owner", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "Senior Dev Resume",
      })
    );
    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot([]));
    (addDoc as jest.Mock)
      .mockResolvedValueOnce({ id: "request-123" })
      .mockResolvedValueOnce({ id: "notification-123" });

    const payload = {
      resumeId: "resume-123",
      message: "Great resume!",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(addDoc).toHaveBeenCalledTimes(2);
  });

  it("should include optional message in request", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({ userId: "owner-123", title: "My Resume" })
    );
    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot([]));
    (addDoc as jest.Mock).mockResolvedValue({ id: "request-123" });

    const message = "I think we'd be great colleagues!";
    const payload = {
      resumeId: "resume-123",
      message,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    await POST(request);

    // Verify message was included in addDoc call
    expect(addDoc).toHaveBeenCalled();
    const firstCall = (addDoc as jest.Mock).mock.calls[0];
    expect(firstCall[1].message).toBe(message);
  });
});
