import { NextRequest } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

// Mock dependencies
jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    respondToRequest: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

describe("POST /api/profiles/respond-access", () => {
  const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.Mock;
  const mockRespondToRequest = AccessService.respondToRequest as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: null });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid request body", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({ requestId: "req1" }), // Missing resumeId and action
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 403 if user does not own the resume (Service throws Unauthorized)", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    mockRespondToRequest.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if request not found", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    mockRespondToRequest.mockRejectedValue(new Error("not found"));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Request not found");
  });

  it("should successfully approve request", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    mockRespondToRequest.mockResolvedValue({ status: "approved" });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRespondToRequest).toHaveBeenCalledWith(
      "user123",
      "resume1",
      "req1",
      "approve",
      undefined
    );
  });

  it("should handle custom overrides within requested duration", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    mockRespondToRequest.mockResolvedValue({ status: "approved" });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
          grantDuration: { preset: "custom_days", customDays: 10 },
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRespondToRequest).toHaveBeenCalledWith(
      "user123",
      "resume1",
      "req1",
      "approve",
      10
    );
  });
});
