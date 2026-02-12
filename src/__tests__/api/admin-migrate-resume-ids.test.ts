import { POST } from "@/app/api/admin/migrate-resume-ids/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/logger");
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
  },
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  mapResumeId: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Admin Migrate Resume IDs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = () => {
    return new NextRequest(
      new URL("http://localhost:3000/api/admin/migrate-resume-ids"),
      {
        method: "POST",
      }
    );
  };

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = createRequest();
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 403 if not an admin", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ role: "jobseeker" }),
        }),
      })),
    });

    const req = createRequest();
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Admin access required");
  });

  it("should migrate resumes successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
        };
      }
      if (col === "resumes") {
        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                size: 2,
                docs: [
                  {
                    id: "doc-1",
                    data: () => ({ userId: "user-1", title: "Resume 1" }),
                  },
                  {
                    id: "doc-2",
                    data: () => ({ userId: "user-2", title: "Resume 2" }),
                  },
                ],
              }),
            })),
          })),
        };
      }
      if (col === "system") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ nextId: 10 }),
            }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }
    });

    (mapResumeId as jest.Mock).mockResolvedValue(undefined);

    const req = createRequest();
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(2);
    expect(data.nextId).toBe(13);
    expect(mapResumeId).toHaveBeenCalledTimes(2);
  });

  it("should handle errors during migration of individual resumes", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
        };
      }
      if (col === "resumes") {
        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                size: 1,
                docs: [
                  {
                    id: "doc-1",
                    data: () => ({ userId: "user-1", title: "Resume 1" }),
                  },
                ],
              }),
            })),
          })),
        };
      }
      if (col === "system") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: false,
            }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }
    });

    (mapResumeId as jest.Mock).mockRejectedValue(new Error("Mapping failed"));

    const req = createRequest();
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(0);
  });

  it("should handle global errors", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
        };
      }
      throw new Error("DB error");
    });

    const req = createRequest();
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");
  });

  it("should handle errors in verifyAdminRole", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        throw new Error("Auth DB error");
      }
    });

    const req = createRequest();
    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});
