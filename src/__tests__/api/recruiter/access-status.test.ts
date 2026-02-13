import {
  buildAccessStatusMap,
  getAccessStatus,
} from "@/app/api/recruiter/search-resumes/access-status";
import { collectionRef, collectionGroupRef, COLLECTIONS } from "@/lib/dal";

jest.mock("@/lib/dal");
jest.mock("@/lib/logger");

const mockCollectionRef = collectionRef as jest.Mock;
const mockCollectionGroupRef = collectionGroupRef as jest.Mock;

function makeMockDoc(
  id: string,
  data: Record<string, unknown>,
  parentId?: string,
) {
  return {
    id,
    data: () => data,
    ref: {
      parent: {
        parent: parentId ? { id: parentId } : null,
      },
    },
  };
}

function makeMockSnapshot(docs: ReturnType<typeof makeMockDoc>[]) {
  return {
    empty: docs.length === 0,
    docs,
    forEach: (fn: (doc: ReturnType<typeof makeMockDoc>) => void) =>
      docs.forEach(fn),
  };
}

describe("access-status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAccessStatus", () => {
    it("should return from accessStatusMap when provided", async () => {
      const map = new Map([["resume-1", "approved" as const]]);
      const result = await getAccessStatus("resume-1", "recruiter-1", map);
      expect(result).toBe("approved");
    });

    it("should return 'none' for unknown resumeId from map", async () => {
      const map = new Map([["resume-1", "approved" as const]]);
      const result = await getAccessStatus("resume-999", "recruiter-1", map);
      expect(result).toBe("none");
    });
  });

  describe("buildAccessStatusMap", () => {
    it("should return empty map when recruiterId is empty", async () => {
      const result = await buildAccessStatusMap("");
      expect(result.size).toBe(0);
    });

    it("should return empty map when collectionGroup is not available", async () => {
      mockCollectionRef.mockReturnValue({
        firestore: {}, // no collectionGroup function
      });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.size).toBe(0);
    });

    it("should populate from pending requests", async () => {
      const requestDoc = makeMockDoc(
        "req-1",
        { status: "pending", fromUserId: "recruiter-1" },
        "resume-1",
      );
      const grantSnapshot = makeMockSnapshot([]);
      const requestSnapshot = makeMockSnapshot([requestDoc]);

      mockCollectionRef.mockReturnValue({
        firestore: {
          collectionGroup: jest.fn(),
        },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.get("resume-1")).toBe("pending");
    });

    it("should populate from valid grants (no expiry)", async () => {
      const grantDoc = makeMockDoc(
        "grant-1",
        { toUserId: "recruiter-1" },
        "resume-2",
      );
      const requestSnapshot = makeMockSnapshot([]);
      const grantSnapshot = makeMockSnapshot([grantDoc]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.get("resume-2")).toBe("approved");
    });

    it("should skip grants with expired dates", async () => {
      const pastDate = new Date("2020-01-01");
      const grantDoc = makeMockDoc(
        "grant-1",
        { toUserId: "recruiter-1", expiresAt: pastDate },
        "resume-3",
      );
      const requestSnapshot = makeMockSnapshot([]);
      const grantSnapshot = makeMockSnapshot([grantDoc]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.has("resume-3")).toBe(false);
    });

    it("should handle approved requests with no expiry", async () => {
      const requestDoc = makeMockDoc(
        "req-2",
        { status: "approved", fromUserId: "recruiter-1" },
        "resume-4",
      );
      const requestSnapshot = makeMockSnapshot([requestDoc]);
      const grantSnapshot = makeMockSnapshot([]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.get("resume-4")).toBe("approved");
    });

    it("should handle denied requests", async () => {
      const requestDoc = makeMockDoc(
        "req-d",
        { status: "denied", fromUserId: "recruiter-1" },
        "resume-5",
      );
      const requestSnapshot = makeMockSnapshot([requestDoc]);
      const grantSnapshot = makeMockSnapshot([]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.get("resume-5")).toBe("denied");
    });

    it("should prioritize pending over denied for same resume", async () => {
      const deniedDoc = makeMockDoc(
        "req-d",
        { status: "denied", fromUserId: "recruiter-1" },
        "resume-6",
      );
      const pendingDoc = makeMockDoc(
        "req-p",
        { status: "pending", fromUserId: "recruiter-1" },
        "resume-6",
      );
      const requestSnapshot = makeMockSnapshot([deniedDoc, pendingDoc]);
      const grantSnapshot = makeMockSnapshot([]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.get("resume-6")).toBe("pending");
    });

    it("should skip docs with no parent resumeId", async () => {
      const noParentDoc = {
        id: "req-np",
        data: () => ({ status: "pending", fromUserId: "recruiter-1" }),
        ref: { parent: { parent: null } },
      };
      const requestSnapshot = makeMockSnapshot([noParentDoc as any]);
      const grantSnapshot = makeMockSnapshot([]);

      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(requestSnapshot),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(grantSnapshot),
          }),
        });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.size).toBe(0);
    });

    it("should handle errors gracefully returning empty map", async () => {
      mockCollectionRef.mockReturnValue({
        firestore: { collectionGroup: jest.fn() },
      });
      mockCollectionGroupRef.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error("Firestore error")),
        }),
      });

      const result = await buildAccessStatusMap("recruiter-1");
      expect(result.size).toBe(0);
    });
  });
});
