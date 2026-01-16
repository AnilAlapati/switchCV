import { POST } from "@/app/api/admin/migrate-numeric-ids/route";
import { NextRequest } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  migrateUserResumesToNumericIds,
  migrateAllResumesToNumericIds,
} from "@/lib/resumeMigration";

jest.mock("@/lib/logger");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/resumeMigration", () => ({
  migrateUserResumesToNumericIds: jest.fn(),
  migrateAllResumesToNumericIds: jest.fn(),
}));

describe("Admin Migrate Numeric IDs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest(
      new URL("http://localhost:3000/api/admin/migrate-numeric-ids"),
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  };

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = createRequest({ migrateAll: true });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should migrate all resumes successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (migrateAllResumesToNumericIds as jest.Mock).mockResolvedValue(10);

    const req = createRequest({ migrateAll: true });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.migratedCount).toBe(10);
    expect(migrateAllResumesToNumericIds).toHaveBeenCalled();
  });

  it("should migrate specific user resumes successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (migrateUserResumesToNumericIds as jest.Mock).mockResolvedValue(2);

    const req = createRequest({ userId: "user-456" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.migratedCount).toBe(2);
    expect(data.userId).toBe("user-456");
    expect(migrateUserResumesToNumericIds).toHaveBeenCalledWith("user-456");
  });

  it("should return 400 if no parameters provided", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    const req = createRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Provide either userId or migrateAll parameter");
  });

  it("should handle errors during migration", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (migrateAllResumesToNumericIds as jest.Mock).mockRejectedValue(
      new Error("Migration failed")
    );

    const req = createRequest({ migrateAll: true });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");
  });
});
