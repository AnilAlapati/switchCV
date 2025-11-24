import { POST } from "./route";
import { NextRequest } from "next/server";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
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
    batch: jest.fn(),
  },
}));

describe("POST /api/resumes/create", () => {
  const mockSet = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockBatchSet = jest.fn();
  const mockBatchCommit = jest.fn();
  const mockGet = jest.fn();
  const mockCount = jest.fn();
  const mockCountGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Firestore mock chain
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    (adminDb.batch as jest.Mock).mockReturnValue({
      set: mockBatchSet,
      commit: mockBatchCommit,
    });

    mockCollection.mockReturnValue({
      doc: mockDoc,
      count: mockCount,
    });
    mockDoc.mockReturnValue({
      set: mockSet,
      get: mockGet,
      collection: mockCollection, // For nested collections
    });
    mockSet.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);

    // Mock getUserTier response
    mockGet.mockResolvedValue({
      data: () => ({ subscriptionTier: "basic" }),
    });

    // Mock resume count response
    mockCount.mockReturnValue({
      get: mockCountGet,
    });
    mockCountGet.mockResolvedValue({
      data: () => ({ count: 0 }),
    });

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
    expect(mockDoc).toHaveBeenCalledWith(String(mockNumericId));
    // expect(mockSet).toHaveBeenCalled(); // Replaced by batch
    expect(mockBatchSet).toHaveBeenCalledTimes(3);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("should return 403 if resume limit is reached", async () => {
    const mockUserId = "user123";

    // Mock Basic tier (limit 3)
    mockGet.mockResolvedValue({
      data: () => ({ subscriptionTier: "basic" }),
    });

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

    // Mock Basic tier
    mockGet.mockResolvedValue({
      data: () => ({ subscriptionTier: "basic" }),
    });

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
    const setCall = mockBatchSet.mock.calls[0]; // First set call (main doc)
    const docData = setCall[1];
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
