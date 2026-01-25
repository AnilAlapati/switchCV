import { NextRequest, NextResponse } from "next/server";
import * as route from "@/app/api/recruiter/requests/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  decrementJobSeekerMetric,
  updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";
import { getUserRole } from "@/lib/services/userService";

// Mock dependencies
jest.mock("@/lib/logger");

jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn(),
}));

const mockDoc: Record<string, unknown> = {
  get: jest.fn(),
  delete: jest.fn().mockReturnValue(Promise.resolve()),
  data: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  exists: true,
  id: "mock-id",
  ref: {
    parent: {
      parent: {
        id: "mock-resume-id",
      },
    },
  },
};

const mockCollection: Record<string, unknown> = {
  doc: jest.fn().mockReturnValue(mockDoc),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  get: jest.fn(),
};

// Setup chaining
mockDoc.collection.mockReturnValue(mockCollection);
mockDoc.doc.mockReturnValue(mockDoc);

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => mockCollection),
    collectionGroup: jest.fn(() => mockCollection),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => {
    return { status: status || 500, json: async () => ({ error: msg }) } as any;
  }),
}));

jest.mock("@/lib/services/metricsService", () => ({
  decrementJobSeekerMetric: jest.fn().mockReturnValue(Promise.resolve()),
  updateRecruiterAccessMetric: jest.fn().mockReturnValue(Promise.resolve()),
}));

describe("Recruiter Requests API Route", () => {
  const mockUserId = "recruiter-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.get.mockReset();
    mockCollection.get.mockReset();
    // Re-setup defaults
    mockCollection.doc.mockReturnValue(mockDoc);
    mockDoc.collection.mockReturnValue(mockCollection);
    mockDoc.doc.mockReturnValue(mockDoc);
  });

  describe("GET", () => {
    it("should return 401 if unauthorized", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        error: { status: 401 },
      });
      const req = new NextRequest("http://localhost/api/recruiter/requests");
      const res = await route.GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 if not a recruiter", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      (getUserRole as jest.Mock).mockResolvedValue("jobseeker");
      mockDoc.get.mockResolvedValue({ data: () => ({ role: "jobseeker" }) });

      const req = new NextRequest("http://localhost/api/recruiter/requests");
      const res = await route.GET(req);
      expect(res.status).toBe(403);
    });

    it("should return requests for recruiter and cover timestamp/expiry logic", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      mockDoc.get.mockResolvedValueOnce({
        data: () => ({ role: "recruiter" }),
      });

      const mockRequestsSnap = {
        docs: [
          {
            id: "req-1",
            data: () => ({
              fromUserId: mockUserId,
              timestamp: { toDate: () => new Date() },
              status: "pending",
              approvedAt: "2023-01-01T00:00:00Z",
              expiresAt: null,
            }),
            ref: { parent: { parent: { id: "resume-1" } } },
          },
          {
            id: "req-2",
            data: () => ({
              fromUserId: mockUserId,
              timestamp: new Date(),
              status: "approved",
              expiresAt: { toDate: () => new Date(Date.now() - 10000) }, // Expired
            }),
            ref: { parent: { parent: { id: "resume-2" } } },
          },
          {
            id: "req-3",
            data: () => ({
              fromUserId: mockUserId,
              timestamp: "2023-01-01T00:00:00Z",
              status: "approved",
              expiresAt: { toDate: () => new Date(Date.now() + 10000) }, // Not expired
            }),
            ref: { parent: { parent: { id: "resume-3" } } },
          },
          {
            id: "req-4",
            data: () => ({
              fromUserId: mockUserId,
              timestamp: new Date("invalid"), // Should trigger catch in serializeTimestamp
              status: "pending",
            }),
            ref: { parent: { parent: { id: "resume-4" } } },
          },
        ],
      };
      mockCollection.get.mockResolvedValueOnce(mockRequestsSnap);

      // Resume and User lookups
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ title: "Resume", userId: "candidate" }),
      });

      const req = new NextRequest("http://localhost/api/recruiter/requests");
      const res = await route.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.requests).toHaveLength(4);
    });

    it("should handle GET errors", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      mockDoc.get.mockRejectedValue(new Error("Firestore error"));

      const req = new NextRequest("http://localhost/api/recruiter/requests");
      const res = await route.GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("should delete request and update metrics", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ fromUserId: mockUserId, status: "pending" }),
      });

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "candidate-1" }),
      });

      const req = new NextRequest(
        "http://localhost/api/recruiter/requests?requestId=req-1&resumeId=resume-1",
        {
          method: "DELETE",
        },
      );
      const res = await route.DELETE(req);
      expect(res.status).toBe(200);
    });

    it("should return 400 if params missing", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      const req = new NextRequest("http://localhost/api/recruiter/requests", {
        method: "DELETE",
      });
      const res = await route.DELETE(req);
      expect(res.status).toBe(400);
    });

    it("should return 404 if request not found", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      const req = new NextRequest(
        "http://localhost/api/recruiter/requests?requestId=req-1&resumeId=resume-1",
        {
          method: "DELETE",
        },
      );
      const res = await route.DELETE(req);
      expect(res.status).toBe(404);
    });

    it("should return 403 if not the owner of the request", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ fromUserId: "other-recruiter" }),
      });

      const req = new NextRequest(
        "http://localhost/api/recruiter/requests?requestId=req-1&resumeId=resume-1",
        {
          method: "DELETE",
        },
      );
      const res = await route.DELETE(req);
      expect(res.status).toBe(403);
    });

    it("should handle DELETE errors", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
      });
      mockDoc.get.mockRejectedValue(new Error("Delete failed"));

      const req = new NextRequest(
        "http://localhost/api/recruiter/requests?requestId=req-1&resumeId=resume-1",
        {
          method: "DELETE",
        },
      );
      const res = await route.DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
