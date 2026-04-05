import { POST } from "./route";
import { NextRequest } from "next/server";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { checkResumeCreationQuota } from "@/lib/services/resumeQuotaService";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({ error: message, details: error?.message }),
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

// Mock the quota service — this is the unit under test for the route layer
jest.mock("@/lib/services/resumeQuotaService", () => ({
  checkResumeCreationQuota: jest.fn(),
}));

// Mock config.server
jest.mock("@/lib/config.server", () => ({
  getResumeRetentionDays: jest
    .fn()
    .mockResolvedValue({ basic: 7, premium: null, enterprise: null }),
  getResumeDeletionGraceDays: jest
    .fn()
    .mockResolvedValue({ basic: 3, premium: null, enterprise: null }),
  getResumeExpiryWarningHours: jest
    .fn()
    .mockResolvedValue({ basic: 72, premium: null, enterprise: null }),
}));

// Mock RAG service (fire-and-forget in route)
jest.mock("@/lib/services/rag/ragService", () => ({
  preIndexResume: jest.fn().mockResolvedValue(undefined),
}));

describe("POST /api/resumes/create", () => {
  const mockSet = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ set: mockSet });
    mockSet.mockResolvedValue(undefined);

    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Default: quota allows creation
    (checkResumeCreationQuota as jest.Mock).mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 1,
      remaining: 1,
      tier: "basic",
    });

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

  it("should create resume successfully when quota allows", async () => {
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

    expect(checkResumeCreationQuota).toHaveBeenCalledWith("user123", "basic");
    expect(mockDoc).toHaveBeenCalledWith(String(mockNumericId));
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("should return 403 if quota service blocks creation (lifetime limit)", async () => {
    (getUserTier as jest.Mock).mockResolvedValue("basic");
    // Lifetime count = 1, limit = 1 — blocked even though active docs = 0
    (checkResumeCreationQuota as jest.Mock).mockResolvedValue({
      allowed: false,
      current: 1,
      limit: 1,
      remaining: 0,
      tier: "basic",
    });

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: "user123",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Maximum resume limit reached for your plan");
    // Must NOT write to Firestore when quota is blocked
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("should enforce quota for premium tier too (not just basic)", async () => {
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (checkResumeCreationQuota as jest.Mock).mockResolvedValue({
      allowed: false,
      current: 50,
      limit: 50,
      remaining: 0,
      tier: "premium",
    });

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: "user123",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("should set expiration date for basic tier", async () => {
    const mockUserId = "user123";
    (getUserTier as jest.Mock).mockResolvedValue("basic");
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1001);

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({
        userId: mockUserId,
        resume: { title: "Resume" },
      }),
    });

    await POST(req);

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

  it("should handle unexpected errors", async () => {
    (generateNumericResumeId as jest.Mock).mockRejectedValue(
      new Error("ID Gen Error"),
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
