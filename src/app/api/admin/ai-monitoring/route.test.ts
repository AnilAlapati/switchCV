import { NextRequest } from "next/server";

jest.mock("@/lib/services/adminService", () => ({
  verifyAdminAccess: jest.fn(),
}));

const mockGetAdminAiMonitoringData = jest.fn();

jest.mock("@/lib/services/adminAiMonitoringService", () => ({
  getAdminAiMonitoringData: (...args: unknown[]) =>
    mockGetAdminAiMonitoringData(...args),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status) =>
    Response.json(
      { error: message, details: error instanceof Error ? error.message : null },
      { status: status || 500 },
    ),
  ),
}));

import { GET } from "./route";
import { verifyAdminAccess } from "@/lib/services/adminService";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

describe("GET /api/admin/ai-monitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/ai-monitoring"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user is not an admin", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });
    (verifyAdminAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/ai-monitoring"),
    );

    expect(response.status).toBe(403);
  });

  it("returns request trace data for a specific requestId", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });
    (verifyAdminAccess as jest.Mock).mockResolvedValue(true);
    mockGetAdminAiMonitoringData.mockResolvedValue({
      requestTrace: {
        summary: {
          id: "req-123",
          requestId: "req-123",
          status: "degraded",
        },
        events: [{ id: "event-1", requestId: "req-123" }],
      },
      dailyMetrics: [],
      openIncidents: { failed_rate: { title: "Failure rate" } },
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/ai-monitoring?requestId=req-123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.requestTrace.summary.requestId).toBe("req-123");
    expect(payload.requestTrace.events).toHaveLength(1);
    expect(mockGetAdminAiMonitoringData).toHaveBeenCalledWith({
      requestId: "req-123",
      limit: null,
      days: null,
      stage: null,
      failureCode: null,
      provider: null,
      model: null,
    });
  });
});
