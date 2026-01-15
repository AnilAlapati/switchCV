import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id", error: null }),
  maybeGetAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id" }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message, details: error?.message }, { status });
  }),
  verifyRecruiterRole: jest.fn().mockResolvedValue(null),
  verifyAdminRole: jest.fn().mockResolvedValue(null),
}));

// Mock getRecruiterSearchBreakdown
jest.mock("@/lib/recruiterSearchHistory", () => ({
  getRecruiterSearchBreakdown: jest.fn().mockResolvedValue({
    searchesLast24h: 0,
    searchesLast7Days: 0,
    uniqueCandidatesLast7Days: 0,
    topSkillsLast7Days: [],
    topLocationsLast7Days: [],
  }),
}));

// Mock userService
jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn().mockResolvedValue("recruiter"),
}));

// Mock metricsService
jest.mock("@/lib/services/metricsService", () => ({
  getRecruiterMetrics: jest.fn().mockResolvedValue({
    totalSearches: 15,
    totalProfileViews: 42,
    totalCandidatesInteracted: 12,
    accessRequests: { pending: 1, approved: 2, denied: 0 },
    lastActivityAt: "2024-01-01",
  }),
}));

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    collectionGroup: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

describe("GET /api/recruiter/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return metrics for valid userId", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=test-user-id"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSearches).toBe(15);
    expect(data.accessRequests).toBeDefined();
  });

  it("should return 400 when userId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/recruiter/metrics");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("userId is required");
  });
});
