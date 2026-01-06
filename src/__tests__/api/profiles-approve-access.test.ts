import { POST } from "@/app/api/profiles/approve-access/route";
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

describe("Profiles Approve Access API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const basePayload = {
    requestId: "req-1",
    resumeId: "res-1",
    duration: "1day",
  };

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing fields", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({ requestId: "req-1" }), // Missing resumeId, duration
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 400 if invalid duration", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-1",
          resumeId: "res-1",
          duration: "invalid",
        }),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 403 if ownership verification fails", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify(basePayload),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should return 404 if resume or request not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("not found"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify(basePayload),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("should approve access successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (AccessService.respondToRequest as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify(basePayload),
      }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 400 if service throws 'already processed'", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (AccessService.respondToRequest as jest.Mock).mockRejectedValue(new Error("already processed"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/approve-access"),
      {
        method: "POST",
        body: JSON.stringify(basePayload),
      }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
