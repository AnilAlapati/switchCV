import { POST, GET } from "@/app/api/admin/init-system/route";
import { NextRequest } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  initializeIdCounter,
  getCurrentIdCounter,
} from "@/lib/numericIdGenerator";
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/logger");
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/numericIdGenerator", () => ({
  initializeIdCounter: jest.fn(),
  getCurrentIdCounter: jest.fn(),
}));

describe("Admin Init System API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (method: string = "POST") => {
    return new NextRequest(
      new URL("http://localhost:3000/api/admin/init-system"),
      {
        method,
      }
    );
  };

  describe("POST", () => {
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

    it("should initialize system successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            data: () => ({ role: "admin" }),
          }),
        })),
      });

      (initializeIdCounter as jest.Mock).mockResolvedValue(undefined);
      (getCurrentIdCounter as jest.Mock).mockResolvedValue(100);

      const req = createRequest();
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.counter.currentId).toBe(100);
      expect(initializeIdCounter).toHaveBeenCalled();
    });

    it("should handle errors during initialization", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            data: () => ({ role: "admin" }),
          }),
        })),
      });

      (initializeIdCounter as jest.Mock).mockRejectedValue(
        new Error("Init failed")
      );

      const req = createRequest();
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to initialize system");
    });

    it("should handle errors in verifyAdminRole", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = createRequest();
      const response = await POST(req);
      expect(response.status).toBe(403);
    });
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = createRequest("GET");
      const response = await GET(req);
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
            data: () => ({ role: "jobseeker" }),
          }),
        })),
      });

      const req = createRequest("GET");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: Admin access required");
    });

    it("should return current counter status", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            data: () => ({ role: "admin" }),
          }),
        })),
      });

      (getCurrentIdCounter as jest.Mock).mockResolvedValue(50);

      const req = createRequest("GET");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.counter.currentId).toBe(50);
    });

    it("should handle errors in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            data: () => ({ role: "admin" }),
          }),
        })),
      });

      (getCurrentIdCounter as jest.Mock).mockRejectedValue(
        new Error("Fetch failed")
      );

      const req = createRequest("GET");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check system status");
    });
  });
});
