import { NextRequest } from "next/server";
import { GET } from "@/app/api/recruiter/search/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier, getUserRole } from "@/lib/services/userService";
import { getRecruiterSearchLimits } from "@/lib/config.server";
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
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/config.server", () => ({
  getRecruiterSearchLimits: jest.fn(),
}));

jest.mock("@/lib/services/quotaService", () => ({
  consumeQuota: jest.fn(),
  QuotaExceededError: class extends Error { },
}));

jest.mock("@/lib/getSystemConfig", () => ({
  getConstants: jest.fn().mockResolvedValue({
    SEARCH_LIMIT_DEFAULT: 20,
    AI_SEARCH: {
      MAX_RESULTS: 50,
    },
  }),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  aiSearchRateLimiter: jest.fn().mockResolvedValue({ allowed: true }),
  checkDistributedRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe("Recruiter Search API", () => {
  const mockUserId = "recruiter-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
      premium: { amount: 100, interval: "month" },
    });
    (consumeQuota as jest.Mock).mockResolvedValue(undefined);

    // Mock Firestore
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ uid: "user-1", displayName: "Candidate 1" }),
            }),
          }),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
      }
      if (col === "resumes") {
        return {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: "resume-1",
                data: () => ({
                  userId: "user-1",
                  title: "Resume 1",
                  published: true,
                  skills: [{ name: "React" }],
                  createdAt: { toDate: () => new Date() },
                }),
              },
            ],
          }),
        };
      }
      return {};
    });
  });

  it("should perform a search for a recruiter", async () => {
    const req = new NextRequest(
      "http://localhost/api/recruiter/search?q=React"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(1);
    expect(data.results[0].resumeId).toBe("resume-1");
  });

  it("should return 403 if quota exceeded", async () => {
    const { QuotaExceededError } = require("@/lib/services/quotaService");
    (consumeQuota as jest.Mock).mockRejectedValue(
      new QuotaExceededError("Quota exceeded")
    );

    const req = new NextRequest(
      "http://localhost/api/recruiter/search?q=React"
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return 403 if not a recruiter", async () => {
    (getUserRole as jest.Mock).mockResolvedValue("jobseeker");

    const req = new NextRequest(
      "http://localhost/api/recruiter/search?q=React"
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return 400 if query is missing", async () => {
    const req = new NextRequest("http://localhost/api/recruiter/search");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
