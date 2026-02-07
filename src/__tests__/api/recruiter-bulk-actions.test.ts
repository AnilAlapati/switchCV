import { POST, GET } from "@/app/api/recruiter/bulk-actions/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { createBulkAction } from "@/lib/recruiterPipelineHelpers";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

jest.mock("@/lib/recruiterPipelineHelpers");

describe("Recruiter Bulk Actions API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: undefined,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("should return 403 if not recruiter", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ role: "jobseeker" }),
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it("should create bulk action successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ role: "recruiter" }),
      });
      (createBulkAction as jest.Mock).mockReturnValue({
        id: "bulk-1",
        actionType: "move",
        candidateIds: ["c1"],
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["c1"],
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bulkAction.id).toBe("bulk-1");
      expect((adminDb as any).set).toHaveBeenCalled();
    });

    it("should execute bulk action successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock)
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "recruiter" }),
        }) // User
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: "pending" }),
        }) // Action
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: "completed" }),
        }); // Updated Action

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
          body: JSON.stringify({ action: "execute", bulkActionId: "bulk-1" }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bulkAction.status).toBe("completed");
      expect((adminDb as any).update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" })
      );
    });

    it("should cancel bulk action successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock)
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "recruiter" }),
        }) // User
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: "pending" }),
        }); // Action

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
          body: JSON.stringify({ action: "cancel", bulkActionId: "bulk-1" }),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(200);
      expect((adminDb as any).delete).toHaveBeenCalled();
    });

    it("should return 400 for unknown action", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ role: "recruiter" }),
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions"),
        {
          method: "POST",
          body: JSON.stringify({ action: "unknown" }),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("should get single bulk action", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock)
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "recruiter" }),
        }) // User
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: "pending" }),
        }); // Action

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions?id=bulk-1")
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bulkAction).toBeDefined();
    });

    it("should get list of bulk actions", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock)
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "recruiter" }),
        }) // User
        .mockResolvedValueOnce({
          docs: [
            { id: "b1", exists: true, data: () => ({ status: "pending" }) },
            { id: "b2", exists: true, data: () => ({ status: "completed" }) },
          ],
        }); // List

      const req = new NextRequest(
        new URL(
          "http://localhost:3000/api/recruiter/bulk-actions?status=pending"
        )
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bulkActions).toHaveLength(2);
      expect(data.byStatus.pending).toBe(1);
    });

    it("should handle errors in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "recruiter-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockRejectedValue(
        new Error("Firestore error")
      );

      const req = new NextRequest(
        new URL("http://localhost:3000/api/recruiter/bulk-actions")
      );
      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });
});
