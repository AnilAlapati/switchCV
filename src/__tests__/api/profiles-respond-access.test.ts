import { POST } from "@/app/api/profiles/respond-access/route";
import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    respondToRequest: jest.fn(),
  },
}));

describe("Profiles Respond Access API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if invalid request", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "invalid",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 403 if not owner (Service throws Unauthorized)", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 404 if request not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("not found"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("should approve access successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue({ status: "approved" });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should deny access successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue({ status: "denied" });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "deny",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it("should return 400 if service throws 'already processed'", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("already processed"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/respond-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          action: "approve",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
