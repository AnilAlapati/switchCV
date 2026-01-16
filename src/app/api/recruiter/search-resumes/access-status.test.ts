import { buildAccessStatusMap, getAccessStatus } from "./access-status";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
}));

describe("access-status", () => {
  const recruiterId = "recruiter-123";
  const resumeId = "resume-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAccessStatus", () => {
    it("should return status from map if provided", async () => {
      const map = new Map([[resumeId, "approved" as const]]);
      const status = await getAccessStatus(resumeId, recruiterId, map);
      expect(status).toBe("approved");
    });

    it("should return 'none' if map provided but resumeId missing", async () => {
      const map = new Map();
      const status = await getAccessStatus(resumeId, recruiterId, map);
      expect(status).toBe("none");
    });

    it("should fetch from DB if map not provided", async () => {
      const mockGet = jest.fn().mockResolvedValue({ docs: [], empty: true });
      const mockWhere = jest.fn().mockReturnThis();
      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet,
      });
      const mockDoc = jest.fn().mockReturnValue({
        collection: mockCollection,
      });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: mockDoc,
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("none");
      expect(adminDb.collection).toHaveBeenCalledWith("resumes");
    });

    it("should return 'approved' if valid grant exists", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockGrantsGet = jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ expiresAt: { toDate: () => futureDate } }) }],
      });

      const mockRequestsGet = jest
        .fn()
        .mockResolvedValue({ docs: [], empty: true });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'pending' if pending request exists", async () => {
      const mockGrantsGet = jest.fn().mockResolvedValue({ docs: [] });
      const mockRequestsGet = jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ status: "pending" }) }],
        empty: false,
      });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("pending");
    });

    it("should return 'denied' if denied request exists", async () => {
      const mockGrantsGet = jest.fn().mockResolvedValue({ docs: [] });
      const mockRequestsGet = jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ status: "denied" }) }],
        empty: false,
      });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("denied");
    });

    it("should return 'none' if no relevant requests exist", async () => {
      const mockGrantsGet = jest.fn().mockResolvedValue({ docs: [] });
      const mockRequestsGet = jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ status: "other" }) }],
        empty: false,
      });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("none");
    });

    it("should return 'approved' if valid approved request exists", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockGrantsGet = jest.fn().mockResolvedValue({ docs: [] });
      const mockRequestsGet = jest.fn().mockResolvedValue({
        docs: [
          {
            data: () => ({
              status: "approved",
              expiresAt: { toDate: () => futureDate },
            }),
          },
        ],
        empty: false,
      });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'approved' if approved request with no expiry exists", async () => {
      const mockGrantsGet = jest.fn().mockResolvedValue({ docs: [] });
      const mockRequestsGet = jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ status: "approved", expiresAt: null }) }],
        empty: false,
      });

      const mockCollection = jest.fn((name) => {
        if (name === "accessGrants")
          return { where: jest.fn().mockReturnThis(), get: mockGrantsGet };
        if (name === "accessRequests")
          return { where: jest.fn().mockReturnThis(), get: mockRequestsGet };
        return {};
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ collection: mockCollection }),
      });

      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("approved");
    });

    it("should handle errors in fetchAccessStatusFromDb", async () => {
      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });
      const status = await getAccessStatus(resumeId, recruiterId);
      expect(status).toBe("none");
    });
  });

  describe("buildAccessStatusMap", () => {
    it("should build an empty map if no grants or requests", async () => {
      (adminDb.collectionGroup as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue([]),
      });

      const map = await buildAccessStatusMap(recruiterId);
      expect(map.size).toBe(0);
    });

    it("should return empty map if collectionGroup is missing", async () => {
      const originalCollectionGroup = adminDb.collectionGroup;
      (adminDb as any).collectionGroup = undefined;

      const map = await buildAccessStatusMap(recruiterId);
      expect(map.size).toBe(0);

      (adminDb as any).collectionGroup = originalCollectionGroup;
    });

    it("should populate map with grants and requests", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 100000);
      const pastDate = new Date(now.getTime() - 100000);

      const mockRequestsSnapshot = [
        {
          data: () => ({ status: "pending" }),
          ref: { parent: { parent: { id: "res-pending" } } },
        },
        {
          data: () => ({ status: "denied" }),
          ref: { parent: { parent: { id: "res-denied" } } },
        },
        {
          data: () => ({
            status: "approved",
            expiresAt: { toDate: () => futureDate },
          }),
          ref: { parent: { parent: { id: "res-approved-req" } } },
        },
        {
          data: () => ({ status: "approved", expiresAt: pastDate }),
          ref: { parent: { parent: { id: "res-expired-req" } } },
        },
        {
          data: () => ({ status: "pending" }),
          ref: undefined,
        },
      ];

      const mockGrantsSnapshot = [
        {
          data: () => ({ expiresAt: null }),
          ref: { parent: { parent: { id: "res-granted" } } },
        },
        {
          data: () => ({ expiresAt: { toDate: () => pastDate } }),
          ref: { parent: { parent: { id: "res-expired-grant" } } },
        },
        {
          data: () => ({ expiresAt: null }),
          ref: undefined,
        },
      ];

      (adminDb.collectionGroup as jest.Mock).mockImplementation((name) => {
        const snapshot =
          name === "accessRequests" ? mockRequestsSnapshot : mockGrantsSnapshot;
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            forEach: (cb: (doc: Record<string, unknown>) => void) => snapshot.forEach(cb),
          }),
        };
      });

      const map = await buildAccessStatusMap(recruiterId);
      expect(map.get("res-pending")).toBe("pending");
      expect(map.get("res-denied")).toBe("denied");
      expect(map.get("res-approved-req")).toBe("approved");
      expect(map.get("res-granted")).toBe("approved");
      expect(map.has("res-expired-grant")).toBe(false);
      expect(map.has("res-expired-req")).toBe(false);
    });

    it("should handle missing recruiterId", async () => {
      const map = await buildAccessStatusMap("");
      expect(map.size).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      (adminDb.collectionGroup as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });
      const map = await buildAccessStatusMap(recruiterId);
      expect(map.size).toBe(0);
    });
  });
});
