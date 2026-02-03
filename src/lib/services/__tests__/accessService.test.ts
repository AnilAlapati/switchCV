import { AccessService } from "@/lib/services/accessService";
import { adminDb } from "@/lib/firebase-admin";
import { getTierForRole } from "@/lib/services/userService";

// Mock Firebase admin
const mockDocGet = jest.fn();
const mockQueryGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockAdd = jest.fn();
const mockWhere = jest.fn().mockReturnThis();

jest.mock("@/lib/firebase-admin", () => {
  return {
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: mockDocGet,
          set: mockSet,
          update: mockUpdate,
          collection: jest.fn(() => ({
            where: mockWhere,
            get: mockQueryGet,
            add: mockAdd,
            doc: jest.fn(() => ({
              get: mockDocGet,
              update: mockUpdate,
              set: mockSet,
            })),
          })),
        })),
        where: mockWhere,
        get: mockQueryGet,
      })),
      collectionGroup: jest.fn(() => ({
        where: mockWhere,
        get: mockQueryGet,
      })),
      runTransaction: jest.fn((cb) =>
        cb({
          get: mockDocGet,
          set: mockSet,
          update: mockUpdate,
        }),
      ),
    },
  };
});

// Mock other dependencies
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/config.server", () => ({
  getRecruiterContactLimits: jest.fn().mockResolvedValue({
    basic: { amount: 2, interval: "lifetime" },
    premium: { amount: 50, interval: "month" },
    enterprise: { amount: 9999, interval: "month" },
  }),
}));
jest.mock("@/lib/services/metricsService", () => ({
  updateRecruiterAccessMetric: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/services/userService", () => ({
  getTierForRole: jest.fn().mockResolvedValue("premium"),
  getUserRole: jest.fn().mockResolvedValue("recruiter"),
  getUserTier: jest.fn().mockResolvedValue("premium"),
}));

describe("AccessService", () => {
  const mockRequesterId = "requester-123";
  const mockResumeId = "resume-456";
  const mockOwnerId = "owner-789";

  beforeEach(() => {
    jest.clearAllMocks();
    mockDocGet.mockReset();
    mockQueryGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockAdd.mockReset();
    mockWhere.mockReturnThis();

    // Default implementations
    mockDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
    mockQueryGet.mockResolvedValue({ exists: false, empty: true, docs: [] });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue({ id: "mock-add-id" });
  });

  describe("requestAccess", () => {
    it("should successfully request access", async () => {
      // 1. User mock (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionTier: "premium", companyName: "Test Corp" }),
      });

      // 2. Limits count snap (QueryGet #1)
      mockQueryGet.mockResolvedValueOnce({ size: 0, docs: [] });

      // 3. Resume mock (DocGet #2)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockOwnerId }),
      });

      // 4. Existing requests check (QueryGet #2)
      mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await AccessService.requestAccess({
        requesterId: mockRequesterId,
        requesterName: "Recruiter",
        resumeId: mockResumeId,
        message: "Hire me",
        durationLabel: "30 days",
        durationDays: 30,
      });

      expect(result).toHaveProperty("requestId", "mock-add-id");
      const { createNotification } = require("@/lib/notificationService");
      expect(createNotification).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false });

      await expect(
        AccessService.requestAccess({
          requesterId: "missing",
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("User not found");
    });

    it("should throw error if company name is missing", async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionTier: "basic" }), // No companyName
      });

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Company name is required to request access.");
    });

    it("should throw error if limit is reached", async () => {
      (getTierForRole as jest.Mock).mockResolvedValueOnce("basic");
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionTier: "basic", companyName: "Basic Corp" }),
      });

      // QueryGet #1
      mockQueryGet.mockResolvedValueOnce({
        size: 2,
        docs: [{ id: "l1" }, { id: "l2" }],
      });

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Limit reached: 2 requests total. Upgrade plan.");
    });

    it("should handle missing index fallback for accessRequests", async () => {
      // 1. User
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "A", subscriptionTier: "enterprise" }),
      });
      // 2. Resume
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other" }),
      });
      // 3. Limits via QueryGet #1
      mockQueryGet.mockResolvedValueOnce({ size: 0 });
      // 4. AccessRequests mock with index error (QueryGet #2)
      const err: any = new Error("index needed");
      err.code = 9;
      mockQueryGet.mockRejectedValueOnce(err);
      // 5. Fallback scan (QueryGet #3)
      mockQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          { data: () => ({ fromUserId: mockRequesterId, status: "pending" }) },
        ],
      });

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Pending request already exists");
    });

    it("should handle missing index fallback for accessGrants", async () => {
      (getTierForRole as jest.Mock).mockResolvedValueOnce("enterprise");
      // 1. User (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "A", subscriptionTier: "enterprise" }),
      });
      // 2. Resume (DocGet #2)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other" }),
      });
      // (Enterprise skips limits query)

      // 3. ExistingRequests query (QueryGet #1) - Empty
      mockQueryGet.mockResolvedValueOnce({ empty: true });

      // 4. AccessGrants query (QueryGet #2) - FAILS 9
      const err: any = new Error("index needed");
      err.code = 9;
      mockQueryGet.mockRejectedValueOnce(err);

      // 5. Fallback scan (QueryGet #3)
      mockQueryGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ toUserId: mockRequesterId, expiresAt: null }) },
        ],
      });

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Already have access");
    });

    it("should throw error if requesting access to own resume", async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "A" }),
      }); // User
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockRequesterId }),
      }); // Resume (same as requester)

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Cannot request access to own resume");
    });

    it("should throw error if already have active access", async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ companyName: "A" }),
      }); // User
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other" }),
      }); // Resume
      mockQueryGet.mockResolvedValueOnce({ size: 0 }); // Limits
      mockQueryGet.mockResolvedValueOnce({ empty: true }); // Existing Request
      mockQueryGet.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              toUserId: mockRequesterId,
              expiresAt: { toDate: () => new Date(Date.now() + 10000) },
            }),
          },
        ],
      }); // Active Grant

      await expect(
        AccessService.requestAccess({
          requesterId: mockRequesterId,
          requesterName: "Recruiter",
          resumeId: mockResumeId,
          durationLabel: "30 days",
          durationDays: 30,
        }),
      ).rejects.toThrow("Already have access");
    });
  });

  describe("respondToRequest", () => {
    it("should grant a request successfully", async () => {
      // 1. Resume ownership verify (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockOwnerId }),
      });
      // 2. Request verify (DocGet #2)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: "pending",
          fromUserId: mockRequesterId,
          resumeId: mockResumeId,
        }),
      });

      const result = await AccessService.respondToRequest(
        mockOwnerId,
        mockResumeId,
        "request-jk1",
        "approve",
      );

      expect(result.status).toBe("approved");
    });

    it("should deny a request successfully", async () => {
      // 1. Resume (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockOwnerId }),
      });
      // 2. Request (DocGet #2)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: "pending",
          fromUserId: mockRequesterId,
          resumeId: mockResumeId,
        }),
      });

      const result = await AccessService.respondToRequest(
        mockOwnerId,
        mockResumeId,
        "request-jk1",
        "deny",
      );

      expect(result.status).toBe("denied");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: "denied" }),
      );
    });

    it("should throw error if request already processed", async () => {
      // 1. Resume
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockOwnerId }),
      });
      // 2. Request
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "approved" }),
      });

      await expect(
        AccessService.respondToRequest(
          mockOwnerId,
          mockResumeId,
          "req-1",
          "approve",
        ),
      ).rejects.toThrow("Request already processed");
    });

    it("should throw error if not owner", async () => {
      // 1. Resume (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "someone-else" }),
      });

      await expect(
        AccessService.respondToRequest(
          mockOwnerId,
          mockResumeId,
          "request-1",
          "approve",
        ),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("checkAccessStatus", () => {
    it("should return owner access type", async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: mockOwnerId }),
      });

      const result = await AccessService.checkAccessStatus(
        mockOwnerId,
        mockResumeId,
      );
      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe("owner");
    });

    it("should return public access type", async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "someone-else", published: true }),
      });

      const result = await AccessService.checkAccessStatus(
        mockRequesterId,
        mockResumeId,
      );
      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe("public");
    });

    it("should return granted access", async () => {
      // 1. Resume (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other", published: false }),
      });
      // 2. Active grants query (QueryGet #1)
      mockQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              expiresAt: { toDate: () => new Date(Date.now() + 1000000) },
            }),
          },
        ],
      });

      const result = await AccessService.checkAccessStatus(
        mockRequesterId,
        mockResumeId,
      );
      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe("granted");
    });

    it("should return none if no access", async () => {
      // 1. Resume (DocGet #1)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other", published: false }),
      });
      // 2. No grants found (QueryGet #1)
      mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await AccessService.checkAccessStatus(
        mockRequesterId,
        mockResumeId,
      );
      expect(result.hasAccess).toBe(false);
      expect(result.accessType).toBe("none");
    });
  });
});
