import {
  getAccessStatus,
  buildAccessStatusMap,
} from "../../../../app/api/recruiter/search-resumes/access-status";

// Mock DAL
const mockCollectionRef = jest.fn();
const mockCollectionGroupRef = jest.fn();

jest.mock("@/lib/dal", () => ({
  collectionRef: (...args: unknown[]) => mockCollectionRef(...args),
  collectionGroupRef: (...args: unknown[]) => mockCollectionGroupRef(...args),
  COLLECTIONS: {
    RESUMES: "resumes",
    USERS: "users",
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe("access-status", () => {
  const mockRecruiterId = "recruiter123";
  const mockResumeId = "resume123";
  const mockNow = new Date("2025-01-01T12:00:00Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAccessStatus", () => {
    it("should return status from map if provided", async () => {
      const map = new Map([["res1", "approved"] as [string, any]]);
      const status = await getAccessStatus("res1", mockRecruiterId, map);
      expect(status).toBe("approved");
    });

    it("should return 'none' if map provided but resumeId missing", async () => {
      const map = new Map();
      const status = await getAccessStatus("res1", mockRecruiterId, map);
      expect(status).toBe("none");
    });

    it("should return 'approved' if there is a valid access grant (toDate)", async () => {
      const mockGrantsSnapshot = {
        docs: [
          {
            data: () => ({
              expiresAt: { toDate: () => new Date("2025-01-02T12:00:00Z") },
            }),
          },
        ],
      };

      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => {
          if (name === "accessGrants") {
            return {
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue(mockGrantsSnapshot),
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          };
        }),
      };

      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'approved' if expiresAt is null (forever)", async () => {
      const mockGrantsSnapshot = {
        docs: [{ data: () => ({ expiresAt: null }) }],
      };
      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => ({
          where: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue(
              name === "accessGrants"
                ? mockGrantsSnapshot
                : { empty: true, docs: [] },
            ),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("approved");
    });

    it("should check requests if no valid grant", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [{ data: () => ({ status: "pending" }) }],
      };
      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => ({
          where: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue(
              name === "accessRequests"
                ? mockRequestsSnapshot
                : { empty: true, docs: [] },
            ),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("pending");
    });

    it("should return 'approved' if request is approved and valid", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [
          {
            data: () => ({
              status: "approved",
              expiresAt: new Date("2025-01-02T12:00:00Z"),
            }),
          },
        ],
      };
      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => ({
          where: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue(
              name === "accessRequests"
                ? mockRequestsSnapshot
                : { empty: true, docs: [] },
            ),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'denied' if request is denied", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [{ data: () => ({ status: "denied" }) }],
      };
      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => ({
          where: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue(
              name === "accessRequests"
                ? mockRequestsSnapshot
                : { empty: true, docs: [] },
            ),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("denied");
    });

    it("should return 'none' if request status is unknown", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [{ data: () => ({ status: "unknown" }) }],
      };
      const mockDoc = {
        collection: jest.fn().mockImplementation((name) => ({
          where: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue(
              name === "accessRequests"
                ? mockRequestsSnapshot
                : { empty: true, docs: [] },
            ),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("none");
    });

    it("should return 'none' if no requests found", async () => {
      const mockDoc = {
        collection: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
      };
      mockCollectionRef.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("none");
    });

    it("should return 'none' if resumeDocRef is null", async () => {
      mockCollectionRef.mockReturnValue({
        doc: null,
      });
      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("none");
    });

    it("should return 'none' if error occurs", async () => {
      mockCollectionRef.mockImplementation(() => {
        throw new Error("DB Error");
      });
      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("none");
    });
  });

  describe("buildAccessStatusMap", () => {
    it("should return empty map if no recruiterId", async () => {
      const map = await buildAccessStatusMap("");
      expect(map.size).toBe(0);
    });

    it("should return empty map if collectionGroup is not a function", async () => {
      // collectionRef(...).firestore must not have collectionGroup
      mockCollectionRef.mockReturnValue({ firestore: {} });
      const map = await buildAccessStatusMap(mockRecruiterId);
      expect(map.size).toBe(0);
    });

    it("should build map from requests and grants with various scenarios", async () => {
      const mockRequestsSnapshot = [
        {
          id: "req1",
          data: () => ({ status: "pending" }),
          ref: { parent: { parent: { id: "resume1" } } },
        },
        {
          id: "req2",
          data: () => ({ status: "denied" }),
          ref: { parent: { parent: { id: "resume2" } } },
        },
        {
          id: "req3",
          data: () => ({ status: "approved", expiresAt: null }),
          ref: { parent: { parent: { id: "resume3" } } },
        },
        {
          id: "req4",
          data: () => ({
            status: "approved",
            expiresAt: { toDate: () => new Date("2024-01-01") },
          }), // Expired toDate
          ref: { parent: { parent: { id: "resume4" } } },
        },
        {
          id: "req5",
          data: () => ({ status: "pending" }),
          ref: { parent: { parent: null } }, // No resumeId
        },
        {
          id: "req6",
          data: () => ({
            status: "approved",
            expiresAt: new Date("2025-01-02"),
          }), // Valid Date object
          ref: { parent: { parent: { id: "resume6" } } },
        },
      ];

      const mockGrantsSnapshot = [
        {
          id: "grant1",
          data: () => ({
            expiresAt: { toDate: () => new Date("2025-01-02T12:00:00Z") },
          }),
          ref: { parent: { parent: { id: "resume10" } } },
        },
        {
          id: "grant2",
          data: () => ({ expiresAt: new Date("2024-01-01") }), // Expired
          ref: { parent: { parent: { id: "resume11" } } },
        },
        {
          id: "grant3",
          data: () => ({ expiresAt: null }), // Forever
          ref: { parent: { parent: { id: "resume12" } } },
        },
      ];

      // collectionRef returns object with .firestore that has .collectionGroup
      mockCollectionRef.mockReturnValue({
        firestore: {
          collectionGroup: jest.fn(),
        },
      });

      mockCollectionGroupRef.mockImplementation((name) => {
        if (name === "accessRequests") {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest
              .fn()
              .mockResolvedValue({
                forEach: (
                  cb: (doc: {
                    id: string;
                    data: () => Record<string, unknown>;
                  }) => void,
                ) => mockRequestsSnapshot.forEach(cb),
              }),
          };
        }
        if (name === "accessGrants") {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest
              .fn()
              .mockResolvedValue({
                forEach: (
                  cb: (doc: {
                    id: string;
                    data: () => Record<string, unknown>;
                  }) => void,
                ) => mockGrantsSnapshot.forEach(cb),
              }),
          };
        }
      });

      const map = await buildAccessStatusMap(mockRecruiterId);
      expect(map.get("resume1")).toBe("pending");
      expect(map.get("resume2")).toBe("denied");
      expect(map.get("resume3")).toBe("approved");
      expect(map.get("resume4")).toBeUndefined();
      expect(map.get("resume6")).toBe("approved");
      expect(map.get("resume10")).toBe("approved");
      expect(map.get("resume11")).toBeUndefined();
      expect(map.get("resume12")).toBe("approved");
    });

    it("should handle errors gracefully", async () => {
      mockCollectionRef.mockReturnValue({
        firestore: {
          collectionGroup: jest.fn(),
        },
      });
      mockCollectionGroupRef.mockImplementation(() => {
        throw new Error("DB Error");
      });
      const map = await buildAccessStatusMap(mockRecruiterId);
      expect(map.size).toBe(0);
    });
  });
});
