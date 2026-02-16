/**
 * Tests for /api/admin/migrate-numeric-ids route
 */

import { POST } from "@/app/api/admin/migrate-numeric-ids/route";
import { NextRequest } from "next/server";
import {
  migrateUserResumesToNumericIds,
  migrateAllResumesToNumericIds,
} from "@/lib/resumeMigration";

jest.mock("@/lib/resumeMigration", () => ({
  migrateUserResumesToNumericIds: jest.fn(),
  migrateAllResumesToNumericIds: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/services/userService", () => ({
  verifyAdminRole: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { verifyAdminRole } from "@/lib/services/userService";

describe("POST /api/admin/migrate-numeric-ids", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "admin-123", error: null });
    (verifyAdminRole as jest.Mock).mockResolvedValue(true);
  });

  it("should return 401 if authorization header is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValueOnce({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });
    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        body: JSON.stringify({ userId: "user-123" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if neither userId nor migrateAll is provided", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Provide either userId or migrateAll parameter");
  });

  it("should migrate all resumes successfully", async () => {
    const mockMigratedCount = 42;
    (migrateAllResumesToNumericIds as jest.Mock).mockResolvedValue(
      mockMigratedCount
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({ migrateAll: true }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Migrated 42 resumes to numeric IDs");
    expect(data.migratedCount).toBe(mockMigratedCount);

    expect(migrateAllResumesToNumericIds).toHaveBeenCalledTimes(1);
    expect(migrateUserResumesToNumericIds).not.toHaveBeenCalled();
  });

  it("should migrate user resumes successfully", async () => {
    const userId = "user-123";
    const mockMigratedCount = 5;
    (migrateUserResumesToNumericIds as jest.Mock).mockResolvedValue(
      mockMigratedCount
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({ userId }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Migrated 5 resume(s) for user to numeric IDs");
    expect(data.migratedCount).toBe(mockMigratedCount);
    expect(data.userId).toBe(userId);

    expect(migrateUserResumesToNumericIds).toHaveBeenCalledWith(userId);
    expect(migrateUserResumesToNumericIds).toHaveBeenCalledTimes(1);
    expect(migrateAllResumesToNumericIds).not.toHaveBeenCalled();
  });

  it("should handle migrateAllResumesToNumericIds error", async () => {
    const mockError = new Error("Database migration failed");
    (migrateAllResumesToNumericIds as jest.Mock).mockRejectedValue(mockError);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({ migrateAll: true }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");

    expect(migrateAllResumesToNumericIds).toHaveBeenCalledTimes(1);
  });

  it("should handle migrateUserResumesToNumericIds error", async () => {
    const userId = "user-123";
    const mockError = new Error("User migration failed");
    (migrateUserResumesToNumericIds as jest.Mock).mockRejectedValue(mockError);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({ userId }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");

    expect(migrateUserResumesToNumericIds).toHaveBeenCalledWith(userId);
    expect(migrateUserResumesToNumericIds).toHaveBeenCalledTimes(1);
  });

  it("should handle unknown error", async () => {
    (migrateAllResumesToNumericIds as jest.Mock).mockRejectedValue(
      "Unknown error"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/migrate-numeric-ids",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
        },
        body: JSON.stringify({ migrateAll: true }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");

    expect(migrateAllResumesToNumericIds).toHaveBeenCalledTimes(1);
  });
});
