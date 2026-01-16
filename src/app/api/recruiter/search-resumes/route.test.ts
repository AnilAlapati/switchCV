import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import {
  getAuthenticatedUserId,
  getClientIp,
  handleApiError,
  attachRateLimitHeaders,
} from "@/lib/utils/api-helpers";
import { getUserRole, getUserTier } from "@/lib/services/userService";
import { createDistributedRateLimiter } from "@/lib/utils/distributedRateLimit";
import {
  buildAccessStatusMap,
  performBasicSearch,
  performPremiumSearch,
} from "./search-service";
import { recordRecruiterSearchEvent } from "@/lib/recruiterSearchHistory";
import { getConstants } from "@/lib/getSystemConfig";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers");
jest.mock("@/lib/services/userService");
jest.mock("@/lib/utils/distributedRateLimit");
jest.mock("./search-service");
jest.mock("@/lib/recruiterSearchHistory");
jest.mock("@/lib/getSystemConfig");
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock("@/lib/logger");

const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockGetUserTier = getUserTier as jest.Mock;
const mockCreateDistributedRateLimiter =
  createDistributedRateLimiter as jest.Mock;
const mockBuildAccessStatusMap = buildAccessStatusMap as jest.Mock;
const mockPerformBasicSearch = performBasicSearch as jest.Mock;
const mockPerformPremiumSearch = performPremiumSearch as jest.Mock;
const mockRecordRecruiterSearchEvent = recordRecruiterSearchEvent as jest.Mock;
const mockGetConstants = getConstants as jest.Mock;
const mockHandleApiError = handleApiError as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

describe("POST /api/recruiter/search-resumes", () => {
  const recruiterId = "recruiter-123";
  const mockRateLimiter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAuthenticatedUserId.mockResolvedValue({ userId: recruiterId });
    mockGetUserRole.mockResolvedValue("recruiter");
    mockGetUserTier.mockResolvedValue("premium");
    mockGetConstants.mockResolvedValue({
      RATE_LIMITS: { SEARCH_REQUESTS_PER_MINUTE: 10 },
    });
    mockCreateDistributedRateLimiter.mockReturnValue(mockRateLimiter);
    mockRateLimiter.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetIn: 60000,
    });
    mockBuildAccessStatusMap.mockResolvedValue({});
    mockPerformBasicSearch.mockResolvedValue({ results: [] });
    mockPerformPremiumSearch.mockResolvedValue({ results: [] });
    mockRecordRecruiterSearchEvent.mockResolvedValue(undefined);
    mockGetClientIp.mockReturnValue("127.0.0.1");

    mockHandleApiError.mockImplementation((err, msg, status = 500) => {
      return NextResponse.json(
        { error: msg || "Internal Server Error" },
        { status }
      );
    });
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/recruiter/search-resumes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce({
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if validation fails (missing recruiterId)", async () => {
    const req = createRequest({ userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid search parameters");
  });

  it("should return 403 if recruiterId does not match logged in user", async () => {
    const req = createRequest({ recruiterId: "other-recruiter", userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 403 if user is not a recruiter or admin", async () => {
    mockGetUserRole.mockResolvedValueOnce("jobseeker");
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Recruiter access required");
  });

  it("should return 403 if recruiterId mismatch and not admin", async () => {
    const req = createRequest({
      recruiterId: "other-recruiter",
      userId: "user-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden: Recruiter mismatch");
  });

  it("should allow recruiterId mismatch if user is admin", async () => {
    mockGetUserRole.mockResolvedValueOnce("admin");
    mockPerformBasicSearch.mockResolvedValueOnce({
      results: [{ userId: "user-1" }],
    });
    const req = createRequest({
      recruiterId: "other-recruiter",
      userId: "user-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPerformBasicSearch).toHaveBeenCalled();
  });

  it("should return 429 if rate limited", async () => {
    mockRateLimiter.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(attachRateLimitHeaders).toHaveBeenCalled();
  });

  it("should perform basic search when userId is provided", async () => {
    mockGetUserTier.mockResolvedValueOnce("basic");
    mockPerformBasicSearch.mockResolvedValueOnce({
      results: [{ userId: "user-1", resumeId: "res-1" }],
      notification: "Basic result",
    });

    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(1);
    expect(data.notification).toBe("Basic result");
    expect(mockPerformBasicSearch).toHaveBeenCalledWith(
      "user-1",
      recruiterId,
      expect.anything()
    );
  });

  it("should return 403 for premium filters on basic tier", async () => {
    mockGetUserTier.mockResolvedValueOnce("basic");
    const req = createRequest({ recruiterId, skills: ["React"] });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Premium or enterprise subscription required");
  });

  it("should perform premium search for premium tier", async () => {
    mockPerformPremiumSearch.mockResolvedValueOnce({
      results: [{ userId: "user-2", resumeId: "res-2" }],
    });

    const req = createRequest({
      recruiterId,
      skills: ["React"],
      location: "NY",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(1);
    expect(mockPerformPremiumSearch).toHaveBeenCalledWith(
      ["React"],
      "NY",
      recruiterId,
      expect.anything()
    );
  });

  it("should handle search service errors in basic search", async () => {
    mockPerformBasicSearch.mockRejectedValueOnce(new Error("DB Error"));
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should handle search service errors in premium search", async () => {
    mockPerformPremiumSearch.mockRejectedValueOnce(new Error("DB Error"));
    const req = createRequest({ recruiterId, skills: ["React"] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should record search event on success", async () => {
    mockPerformPremiumSearch.mockResolvedValueOnce({
      results: [{ userId: "user-1" }],
    });
    const req = createRequest({ recruiterId, skills: ["React"] });
    await POST(req);
    expect(mockRecordRecruiterSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        recruiterId,
        resultCount: 1,
      })
    );
  });

  it("should handle invalid JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/recruiter/search-resumes",
      {
        method: "POST",
        body: "invalid",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if no valid search parameters provided", async () => {
    const req = createRequest({ recruiterId });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      "Please provide either a userId or skills/location for search"
    );
  });

  it("should handle metrics update failure gracefully", async () => {
    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockRejectedValue(new Error("Metrics failed")),
      }),
    });
    mockPerformBasicSearch.mockResolvedValueOnce({ results: [] });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("should handle missing results in basic search", async () => {
    mockPerformBasicSearch.mockResolvedValueOnce({ results: [] });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notification).toBe("No resume found");
  });

  it("should handle unexpected errors in the main block", async () => {
    mockGetUserRole.mockRejectedValueOnce(new Error("Unexpected error"));
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to process request");
  });

  it("should use notification from search service if provided", async () => {
    mockPerformBasicSearch.mockResolvedValueOnce({
      results: [{ userId: "user-1" }],
      notification: "Custom notification",
    });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.notification).toBe("Custom notification");
  });

  it("should return 401 if authenticatedUserId is missing but no authError", async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce({
      userId: null,
      error: null,
    });
    const req = createRequest({ recruiterId, userId: "user-1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
