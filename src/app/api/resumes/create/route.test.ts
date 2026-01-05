import { POST } from "./route";
import { NextRequest } from "next/server";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({ error: message, details: error.message }),
  })),
}));

// Mock numericIdGenerator
jest.mock("@/lib/numericIdGenerator");

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

describe("POST /api/resumes/create", () => {
  const mockSet = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockWhere = jest.fn();
  const mockCount = jest.fn();
  const mockCountGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Firestore mock chain
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });
    mockDoc.mockReturnValue({
      set: mockSet,
    });
    mockSet.mockResolvedValue(undefined);

    mockWhere.mockReturnValue({
      count: mockCount,
    });

    mockCount.mockReturnValue({
      get: mockCountGet,
    });

    mockCountGet.mockResolvedValue({
      data: () => ({ count: 0 }),
    });

    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Default auth mock
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user123",
      error: null,
    });
  });

  it("should return 400 if required fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 403 if user tries to save for another user", async () => {
    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: "otherUser",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Unauthorized");
  });

  it("should create resume successfully", async () => {
    const mockUserId = "user123";
    const mockNumericId = 1001;
    const mockResume = { title: "My Resume" };

    (generateNumericResumeId as jest.Mock).mockResolvedValue(mockNumericId);

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: mockUserId,
        resume: mockResume,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBe(mockNumericId);

    // Verify Firestore calls
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockWhere).toHaveBeenCalledWith("userId", "==", mockUserId);
    expect(mockDoc).toHaveBeenCalledWith(String(mockNumericId));
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("should return 403 if resume limit is reached", async () => {
    const mockUserId = "user123";

    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Mock existing count = 3
    mockCountGet.mockResolvedValue({
      data: () => ({ count: 3 }),
    });

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: mockUserId,
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("You have reached the limit");
  });

  it("should set expiration date for basic tier", async () => {
    const mockUserId = "user123";

    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Mock count = 0
    mockCountGet.mockResolvedValue({
      data: () => ({ count: 0 }),
    });

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: mockUserId,
        resume: { title: "Resume" },
      }),
    });

    await POST(req);

    // Verify expiresAt was set in Firestore
    const docData = mockSet.mock.calls[0][0];
    expect(docData.expiresAt).toBeDefined();
    expect(typeof docData.expiresAt).toBe("string");
    expect(docData.deletionScheduledAt).toBeDefined();
    expect(typeof docData.deletionScheduledAt).toBe("string");
    expect(docData.countdownStartsAt).toBeDefined();
    expect(typeof docData.countdownStartsAt).toBe("string");
    expect(docData.expirationWarningHours).toBe(72);

    const deletionMs = new Date(docData.deletionScheduledAt!).getTime();
    const countdownMs = new Date(docData.countdownStartsAt!).getTime();
    expect(deletionMs - countdownMs).toBe(72 * 60 * 60 * 1000);
  });

  it("should handle errors", async () => {
    (generateNumericResumeId as jest.Mock).mockRejectedValue(
      new Error("ID Gen Error")
    );

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: "user123",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create resume");
  });
});
