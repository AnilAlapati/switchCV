import { NextRequest } from "next/server";
import { GET } from "@/app/api/recruiter/metrics/route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";
import { getUserRole } from "@/lib/services/userService";
import { getRecruiterMetrics } from "@/lib/services/metricsService";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    Response.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 }
    )
  ),
}));

jest.mock("@/lib/recruiterSearchHistory", () => ({
  getRecruiterSearchBreakdown: jest.fn(),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/services/metricsService", () => ({
  getRecruiterMetrics: jest.fn(),
  getMarketInsights: jest.fn(() => Promise.resolve({
    totalCount: 100,
    topSkills: ["React", "TypeScript", "Node.js"]
  })),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Metrics API", () => {
  const mockUserId = "recruiter-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (getUserRole as jest.Mock).mockResolvedValue("recruiter");
    (getRecruiterMetrics as jest.Mock).mockResolvedValue({
      totalSearches: 10,
      totalProfileViews: 5,
      totalCandidatesInteracted: 2,
      lastActivityAt: "2024-01-01",
      accessRequests: { pending: 1, approved: 2, denied: 0 },
    });
    (getRecruiterSearchBreakdown as jest.Mock).mockResolvedValue({
      "Software Engineer": 5,
    });
  });

  it("should fetch recruiter metrics", async () => {
    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=${mockUserId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSearches).toBe(10);
    expect(data.accessRequests.pending).toBe(1);
  });

  it("should return 403 if accessing another user's metrics", async () => {
    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=other-user`
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should allow admin to access any user's metrics", async () => {
    (getUserRole as jest.Mock).mockImplementation((uid) => {
      if (uid === mockUserId) return "admin";
      return "recruiter";
    });

    const req = new NextRequest(
      `http://localhost/api/recruiter/metrics?userId=other-user`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should return 400 if userId is missing", async () => {
    const req = new NextRequest(`http://localhost/api/recruiter/metrics`);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
