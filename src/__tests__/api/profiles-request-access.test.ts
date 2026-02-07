import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/profiles/request-access/route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { normalizeDuration } from "@/lib/accessDuration";
import { AccessService } from "@/lib/services/accessService";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg, details: err?.message }, { status });
  }),
}));

jest.mock("@/lib/accessDuration", () => ({
  normalizeDuration: jest.fn(),
}));

jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    requestAccess: jest.fn(),
  },
}));

describe("Profiles Request Access API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (normalizeDuration as jest.Mock).mockReturnValue({
      label: "1 day",
      durationMs: 86400000,
    });
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      { method: "POST" }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if resumeId is missing", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({ duration: { preset: "1_day" } }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Resume ID is required");
  });

  it("should create request successfully", async () => {
    (AccessService.requestAccess as jest.Mock).mockResolvedValue({
      requestId: "req-123",
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "res-1",
          duration: { preset: "1_day" },
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(AccessService.requestAccess).toHaveBeenCalled();
  });

  it("should handle service errors with correct status codes", async () => {
    (AccessService.requestAccess as jest.Mock).mockRejectedValue(
      new Error("Pending request")
    );

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/request-access"),
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "res-1",
          duration: { preset: "1_day" },
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("Access already requested or granted");
  });
});
