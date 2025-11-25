/**
 * Tests for /api/admin/init-system route
 *
 * This endpoint now requires admin authentication.
 * Tests must mock both the auth helpers and provide proper request objects.
 */

import { GET, POST } from "@/app/api/admin/init-system/route";
import { NextRequest } from "next/server";
import {
  initializeIdCounter,
  getCurrentIdCounter,
} from "@/lib/numericIdGenerator";
import * as apiHelpers from "@/lib/utils/api-helpers";

jest.mock("@/lib/numericIdGenerator", () => ({
  initializeIdCounter: jest.fn(),
  getCurrentIdCounter: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  ...jest.requireActual("@/lib/utils/api-helpers"),
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status) => {
    return Response.json(
      {
        success: false,
        message: `❌ ${message}`,
        error: error?.message || "Unknown error",
      },
      { status }
    );
  }),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({ role: "admin" }),
          })
        ),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: jest.fn(() => Promise.resolve({ uid: "test-admin-uid" })),
  },
}));

/**
 * Helper to create a mock authenticated request
 */
function createMockRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/init-system", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
    },
  });
}

describe("POST /api/admin/init-system", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated admin user
    (apiHelpers.getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-admin-uid",
    });
  });

  it("should initialize system successfully", async () => {
    const mockCounter = 5;
    (initializeIdCounter as jest.Mock).mockResolvedValue(undefined);
    (getCurrentIdCounter as jest.Mock).mockResolvedValue(mockCounter);

    const request = createMockRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("System initialized successfully");
    expect(data.status).toBe("initialized");
    expect(data.counter.currentId).toBe(mockCounter);
    expect(data.nextResumeId).toBe(mockCounter + 1);
    expect(data.firebaseLocation).toBe("system/resumeIdCounter");

    expect(initializeIdCounter).toHaveBeenCalledTimes(1);
    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should return 401 when not authenticated", async () => {
    (apiHelpers.getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = createMockRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(initializeIdCounter).not.toHaveBeenCalled();
  });

  it("should handle initialization error", async () => {
    const mockError = new Error("Database connection failed");
    (initializeIdCounter as jest.Mock).mockRejectedValue(mockError);

    const request = createMockRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to initialize system");
    expect(data.error).toBe("Database connection failed");

    expect(initializeIdCounter).toHaveBeenCalledTimes(1);
    expect(getCurrentIdCounter).not.toHaveBeenCalled();
  });

  it("should handle unknown error", async () => {
    (initializeIdCounter as jest.Mock).mockRejectedValue("Unknown error");

    const request = createMockRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to initialize system");
  });
});

describe("GET /api/admin/init-system", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated admin user
    (apiHelpers.getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-admin-uid",
    });
  });

  /**
   * Helper to create a mock GET request
   */
  function createMockGetRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/admin/init-system", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
      },
    });
  }

  it("should return system status successfully", async () => {
    const mockCounter = 10;
    (getCurrentIdCounter as jest.Mock).mockResolvedValue(mockCounter);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("System status retrieved");
    expect(data.status).toBe("active");
    expect(data.counter.currentId).toBe(mockCounter);
    expect(data.nextResumeId).toBe(mockCounter + 1);
    expect(data.firebaseLocation).toBe("system/resumeIdCounter");

    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should return 401 when not authenticated", async () => {
    (apiHelpers.getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(getCurrentIdCounter).not.toHaveBeenCalled();
  });

  it("should handle status check error", async () => {
    const mockError = new Error("Firebase error");
    (getCurrentIdCounter as jest.Mock).mockRejectedValue(mockError);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to check system status");
    expect(data.error).toBe("Firebase error");

    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should handle unknown error in GET", async () => {
    (getCurrentIdCounter as jest.Mock).mockRejectedValue(null);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to check system status");
  });
});
