import { RecruiterService } from "../recruiterService";
import { adminDb } from "@/lib/firebase-admin";
import { getUserTier, getUserRole } from "@/lib/services/userService";
import { getRecruiterSearchLimits } from "@/lib/config.server";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { Timestamp } from "firebase-admin/firestore";
import {
  decrementJobSeekerMetric,
  updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";

// For triggering Zod validation failures

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/config.server", () => ({
  getRecruiterSearchLimits: jest.fn(),
}));

jest.mock("@/lib/services/quotaService", () => ({
  consumeQuota: jest.fn(),
  QuotaExceededError: class extends Error {
    constructor() {
      super("Quota exceeded");
    }
  },
}));

jest.mock("@/lib/services/metricsService", () => ({
  decrementJobSeekerMetric: jest.fn(),
  updateRecruiterAccessMetric: jest.fn(),
}));

jest.mock("@/lib/logger");

describe("RecruiterService", () => {
  const mockUserId = "test-recruiter-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("enforceRecruiterRole", () => {
    it("should allow recruiter role", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      const role = await RecruiterService.enforceRecruiterRole(mockUserId);
      expect(role).toBe("recruiter");
    });

    it("should allow admin role", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("admin");
      const role = await RecruiterService.enforceRecruiterRole(mockUserId);
      expect(role).toBe("admin");
    });

    it("should throw error for other roles", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("jobseeker");
      await expect(
        RecruiterService.enforceRecruiterRole(mockUserId),
      ).rejects.toThrow("forbidden-role");
    });
  });

  describe("searchCandidates", () => {
    it("should throw error if query is empty", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      await expect(
        RecruiterService.searchCandidates(mockUserId, ""),
      ).rejects.toThrow("Search query is required");
    });

    it("should throw QuotaExceededError if quota is exceeded", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("basic");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({ basic: 10 });
      (consumeQuota as jest.Mock).mockRejectedValue(
        new QuotaExceededError("Quota exceeded"),
      );

      await expect(
        RecruiterService.searchCandidates(mockUserId, "java"),
      ).rejects.toThrow("Quota exceeded");
    });

    it("should return formatted search results", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 1000,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      (adminDb.collection as jest.Mock).mockImplementation((path) => {
        if (path === "users") {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "candidate-1",
                  data: () => ({
                    uid: "candidate-1",
                    displayName: "John Doe",
                    email: "john@example.com",
                    role: "jobseeker",
                  }),
                },
              ],
            }),
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  uid: "candidate-1",
                  displayName: "John Doe",
                  email: "john@example.com",
                  role: "jobseeker",
                }),
              }),
            }),
          };
        }
        if (path === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "resume-1",
                  data: () => ({
                    title: "Senior Java Developer",
                    userId: "candidate-1",
                    published: true,
                    skills: ["Java"],
                    createdAt: new Date(),
                  }),
                },
              ],
            }),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
      });

      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "java",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].title).toBe("Senior Java Developer");
      expect(response.results[0].userName).toBe("John Doe");
      expect(response.results[0].skills).toContain("Java");
    });
  });

  describe("getRecruiterRequests", () => {
    it("should return requests for a recruiter", async () => {
      // Mock timestamp with toDate function
      const mockTimestamp = Timestamp.fromDate(new Date());
      const mockRequestData = {
        fromUserId: mockUserId,
        status: "pending",
        timestamp: mockTimestamp,
      };

      (adminDb.collectionGroup as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "req-1",
              data: () => mockRequestData,
              ref: {
                parent: {
                  parent: {
                    id: "res-1",
                  },
                },
              },
            },
          ],
        }),
      });

      (adminDb.collection as jest.Mock).mockImplementation(
        (collName: string) => {
          if (collName === "resumes") {
            return {
              doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({
                    title: "Senior Java Developer",
                    userId: "user-1",
                  }),
                }),
              }),
            };
          }
          if (collName === "users") {
            return {
              doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ displayName: "John Doe" }),
                }),
              }),
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn().mockReturnThis(),
          };
        },
      );

      const results = await RecruiterService.getRecruiterRequests(mockUserId);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("req-1");
      expect(typeof results[0].timestamp).toBe("string");
    });
  });

  describe("deleteRecruiterRequest", () => {
    it("should delete a request if it belongs to the recruiter", async () => {
      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockRequestDoc = {
        exists: true,
        data: () => ({ fromUserId: mockUserId, status: "pending" }),
        delete: mockDelete,
        ref: { delete: mockDelete },
      };

      (adminDb.collection as jest.Mock).mockImplementation(
        (collName: string) => {
          if (collName === "resumes") {
            return {
              doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ userId: "user-1" }),
                }),
                collection: jest.fn().mockReturnValue({
                  doc: jest.fn().mockReturnValue({
                    ...mockRequestDoc,
                    get: jest.fn().mockResolvedValue(mockRequestDoc),
                  }),
                }),
              }),
            };
          }
          return {
            doc: jest.fn().mockReturnThis(),
            get: jest.fn().mockReturnThis(),
          };
        },
      );

      await RecruiterService.deleteRecruiterRequest(
        mockUserId,
        "req-1",
        "res-1",
      );
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should throw 404 if request not found", async () => {
      (adminDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: false }),
            }),
          }),
        }),
      }));

      await expect(
        RecruiterService.deleteRecruiterRequest(mockUserId, "req-1", "res-1"),
      ).rejects.toThrow("request-not-found");
    });

    it("should throw 403 if request belongs to someone else", async () => {
      (adminDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ fromUserId: "other-id" }),
              }),
            }),
          }),
        }),
      }));

      await expect(
        RecruiterService.deleteRecruiterRequest(mockUserId, "req-1", "res-1"),
      ).rejects.toThrow("unauthorized");
    });
  });

  describe("Helper methods and edge cases", () => {
    it("should handle serializeTimestamp edge cases", async () => {
      // @ts-expect-error - access private method for testing
      expect(RecruiterService.serializeTimestamp(null)).toBeNull();

      const invalidDate = "not-a-date";
      // @ts-expect-error - testing invalid input type
      expect(RecruiterService.serializeTimestamp(invalidDate)).toBeNull();

      const throwingObject = {
        toDate: () => {
          throw new Error("Date fail");
        },
      };
      // @ts-expect-error - testing error handling with invalid object
      expect(RecruiterService.serializeTimestamp(throwingObject)).toBeNull();
    });

    it("should handle calculateExpiryState edge cases", async () => {
      // @ts-expect-error - testing null input handling
      expect(RecruiterService.calculateExpiryState(null)).toEqual({
        isExpired: false,
        timeRemainingMs: null,
      });

      // @ts-expect-error - testing invalid date string
      expect(RecruiterService.calculateExpiryState("invalid-iso")).toEqual({
        isExpired: false,
        timeRemainingMs: null,
      });

      const pastDate = new Date(Date.now() - 10000).toISOString();
      // @ts-expect-error - testing expired date handling
      const pastState = RecruiterService.calculateExpiryState(pastDate);
      expect(pastState.isExpired).toBe(true);
      expect(pastState.timeRemainingMs).toBeLessThan(0);
    });

    it("should handle recruiter requests with missing documents", async () => {
      const recruiterId = "recruiter-123";
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: "recruiter" }),
          }),
        }),
      });

      (adminDb.collectionGroup as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              data: () => ({
                fromUserId: recruiterId,
                status: "pending",
                timestamp: { toDate: () => new Date() },
              }),
              ref: {
                parent: {
                  parent: { id: "non-existent-resume" },
                },
              },
            },
          ],
        }),
      });

      // Mock resumes collection to return non-existent
      (adminDb.collection as jest.Mock).mockImplementation((name) => {
        if (name === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            }),
          };
        }
        if (name === "resumes") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: false,
              }),
            }),
          };
        }
        return {};
      });

      const results = await RecruiterService.getRecruiterRequests(recruiterId);
      expect(results[0].resumeTitle).toBe("Unknown Resume");
      expect(results[0].candidateName).toBe("Unknown Candidate");
    });

    it("should handle fetchUserDoc fallback", async () => {
      (adminDb.collection as jest.Mock).mockImplementation((name) => {
        if (name === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: false }),
            }),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  exists: true,
                  data: () => ({
                    uid: "fallback-id",
                    displayName: "Fallback Name",
                  }),
                },
              ],
            }),
          };
        }
        return {};
      });

      const userDoc = await (RecruiterService as any).fetchUserDoc("test-id");
      expect(userDoc?.data()?.displayName).toBe("Fallback Name");
    });

    it("should handle searchCandidates error path", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      await expect(
        RecruiterService.searchCandidates(mockUserId, "query"),
      ).rejects.toThrow("DB Error");
    });

    it("should handle skills with name property", async () => {
      const mockResumeData = {
        title: "Chef",
        skills: [{ name: "Cooking" }],
        createdAt: new Date(),
        userId: "u1",
      };
      // @ts-expect-error - testing skills with name property
      const result = RecruiterService.buildResult("r1", mockResumeData, null);
      expect(result.skills).toContain("Cooking");
    });

    it("should handle deleteRecruiterRequest with metrics", async () => {
      (adminDb.collection as jest.Mock).mockImplementation((name) => {
        if (name === "resumes") {
          return {
            doc: jest.fn().mockImplementation((id) => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ userId: "owner-1" }),
              }),
              collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ fromUserId: mockUserId, status: "pending" }),
                  }),
                  delete: jest.fn().mockResolvedValue(undefined),
                }),
              }),
            })),
          };
        }
        return {};
      });

      await RecruiterService.deleteRecruiterRequest(
        mockUserId,
        "req-1",
        "res-1",
      );
      expect(decrementJobSeekerMetric).toHaveBeenCalledWith(
        "owner-1",
        "contactRequests",
      );
      expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(
        mockUserId,
        "pending",
        -1,
      );
    });

    it("should search users as fallback if no resumes found", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 100,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      const mockResumesGet = jest
        .fn()
        .mockResolvedValueOnce({ docs: [] }) // first call (fallback loop doesn't exist yet)
        .mockResolvedValueOnce({
          // second call (inside user fallback loop)
          docs: [
            {
              id: "res-1",
              data: () => ({
                title: "Manager",
                userId: "user-1",
                published: true,
                createdAt: new Date(),
                skills: ["Management"],
              }),
            },
          ],
        });

      (adminDb.collection as jest.Mock).mockImplementation((coll) => {
        if (coll === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: mockResumesGet,
          };
        }
        if (coll === "users") {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "user-1",
                  data: () => ({
                    uid: "user-1",
                    displayName: "John Fallback",
                    email: "john@fallback.com",
                    role: "jobseeker",
                    publicProfile: { visible: true },
                  }),
                },
              ],
            }),
          };
        }
        return {};
      });

      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "John",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].userName).toBe("John Fallback");
    });

    it("should handle invalid user data during search", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 100,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      (adminDb.collection as jest.Mock).mockImplementation((path) => {
        if (path === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "res-1",
                  data: () => ({
                    title: "Dev",
                    userId: "fail-user",
                    published: true,
                    createdAt: new Date(),
                    skills: [],
                  }),
                },
              ],
            }),
          };
        }
        if (path === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ uid: 123 }), // invalid uid (not string) to trigger Zod fail
              }),
            }),
          };
        }
        return {};
      });

      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "dev",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].userName).toBe("Unknown User");
    });

    it("should handle skills as objects and match search query", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 100,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      (adminDb.collection as jest.Mock).mockImplementation((path) => {
        if (path === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "res-1",
                  data: () => ({
                    title: "Frontend Developer",
                    userId: "user-1",
                    published: true,
                    createdAt: new Date(),
                    skills: [{ name: "React" }, "TypeScript"],
                  }),
                },
                {
                  id: "res-skipped",
                  data: () => ({
                    title: "Backend",
                    userId: "user-2",
                    published: true,
                    createdAt: new Date(),
                    skills: ["Go"],
                  }),
                },
              ],
            }),
          };
        }
        if (path === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  uid: "user-1",
                  personalInfo: { name: "John Doe", email: "john@example.com" },
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Search for "react" - should match res-1
      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "react",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].resumeId).toBe("res-1");
    });

    it("should handle unexpected errors in quota consumption", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("basic");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({ basic: 10 });
      (consumeQuota as jest.Mock).mockRejectedValue(
        new Error("Unexpected Quota Error"),
      );

      await expect(
        RecruiterService.searchCandidates(mockUserId, "java"),
      ).rejects.toThrow("Unexpected Quota Error");
    });

    it("should skip invalid resumes during search", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 100,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      (adminDb.collection as jest.Mock).mockImplementation((path) => {
        if (path === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "res-invalid",
                  data: () => ({ invalid: "data" }), // Fails ResumeSchema
                },
                {
                  id: "res-valid",
                  data: () => ({
                    title: "Dev",
                    userId: "user-1",
                    published: true,
                    createdAt: new Date(),
                    skills: ["React"],
                  }),
                },
              ],
            }),
          };
        }
        if (path === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  uid: "user-1",
                  personalInfo: { name: "User", email: "u@e.com" },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "dev",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].resumeId).toBe("res-valid");
    });

    it("should handle user fetch error gracefully", async () => {
      (getUserRole as jest.Mock).mockResolvedValue("recruiter");
      (getUserTier as jest.Mock).mockResolvedValue("enterprise");
      (getRecruiterSearchLimits as jest.Mock).mockResolvedValue({
        enterprise: 100,
      });
      (consumeQuota as jest.Mock).mockResolvedValue(undefined);

      (adminDb.collection as jest.Mock).mockImplementation((path) => {
        if (path === "resumes") {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: "res-1",
                  data: () => ({
                    title: "Dev",
                    userId: "error-user",
                    published: true,
                    createdAt: new Date(),
                    skills: [],
                  }),
                },
              ],
            }),
          };
        }
        if (path === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error("Database Error")),
            }),
          };
        }
        return {};
      });

      const response = await RecruiterService.searchCandidates(
        mockUserId,
        "dev",
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].userName).toBe("Unknown User");
    });
  });
});
