import { GET } from "@/app/api/profiles/check-access/route";
import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

jest.mock("@/lib/services/accessService", () => ({
  AccessService: {
    checkAccessStatus: jest.fn(),
  },
}));

describe("Profiles Check Access API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if resumeId is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access")
    );
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("should return 404 if resume not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.checkAccessStatus as jest.Mock).mockRejectedValue(new Error("Resume not found"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(404);
  });

  it("should return access info if successful", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    const mockResult = { hasAccess: true, accessType: "owner" };
    (AccessService.checkAccessStatus as jest.Mock).mockResolvedValue(mockResult);

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessType).toBe("owner");
  });

  it("should handle errors in GET", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (AccessService.checkAccessStatus as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(500);
  });
});
