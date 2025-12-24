import { NextRequest } from "next/server";
import { POST } from "@/app/api/recruiter/request-access/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { getRecruiterContactLimits } from "@/lib/config.server";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 }
    )
  ),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/config.server", () => ({
  getRecruiterContactLimits: jest.fn(),
}));

jest.mock("@/lib/services/quotaService", () => ({
  consumeQuota: jest.fn(),
  QuotaExceededError: class extends Error {},
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Request Access API", () => {
  const mockRecruiterId = "recruiter-123";
  const mockResumeId = "resume-456";
  const mockUserId = "user-789";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
    });
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (getRecruiterContactLimits as jest.Mock).mockResolvedValue({
      premium: { amount: 50, interval: "month" },
    });
    (consumeQuota as jest.Mock).mockResolvedValue(undefined);

    // Mock Firestore
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter", email: "user@example.com" }),
            }),
          }),
        };
      }
      if (col === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ userId: mockUserId, title: "My Resume" }),
            }),
          }),
        };
      }
      if (col === "recruiterRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true }),
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue({}),
          }),
        };
      }
      return {};
    });
  });

  it("should create a new access request", async () => {
    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("should return 403 if quota exceeded", async () => {
    const { QuotaExceededError } = require("@/lib/services/quotaService");
    (consumeQuota as jest.Mock).mockRejectedValue(
      new QuotaExceededError("Quota exceeded")
    );

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 409 if request already exists", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter" }),
            }),
          }),
        };
      }
      if (col === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ userId: mockUserId }),
            }),
          }),
        };
      }
      if (col === "recruiterRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: false }),
        };
      }
      return {};
    });

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("should return 403 if not a recruiter", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "jobseeker" }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
