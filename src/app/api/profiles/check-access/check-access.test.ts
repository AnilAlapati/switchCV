/**
 * Tests for /api/profiles/check-access route
 */

import { GET } from "@/app/api/profiles/check-access/route";
import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

// Mock AccessService
jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    checkAccessStatus: jest.fn(),
  },
}));

describe("GET /api/profiles/check-access", () => {
  const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.Mock;
  const mockCheckAccessStatus = AccessService.checkAccessStatus as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "test-user-123", error: null });
  });

  it("should return 400 if resumeId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 404 if resume doesn't exist", async () => {
    mockCheckAccessStatus.mockRejectedValue(new Error("Resume not found"));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return access status from service", async () => {
    const mockResult = { hasAccess: true, accessType: "owner", message: "Owner" };
    mockCheckAccessStatus.mockResolvedValue(mockResult);

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResult);
    expect(mockCheckAccessStatus).toHaveBeenCalledWith("test-user-123", "resume-123");
  });

  it("should handle database errors gracefully", async () => {
    mockCheckAccessStatus.mockRejectedValue(new Error("Database connection error"));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to check access");
  });
});
