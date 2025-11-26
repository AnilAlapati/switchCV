import {
  getAccessStatus,
  buildAccessStatusMap,
} from "../../../../app/api/recruiter/search-resumes/access-status";
import { adminDb } from "@/lib/firebase-admin";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
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
    it("should return 'approved' if there is a valid access grant", async () => {
      const mockGrantsSnapshot = {
        docs: [
          {
            data: () => ({
              expiresAt: { toDate: () => new Date("2025-01-02T12:00:00Z") },
            }),
          },
        ],
      };

      const mockCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockImplementation((name) => {
            if (name === "accessGrants") {
              return {
                where: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockGrantsSnapshot),
                }),
              };
            }
            return {
              where: jest
                .fn()
                .mockReturnValue({
                  get: jest.fn().mockResolvedValue({ empty: true }),
                }),
            };
          }),
        }),
      });

      (adminDb.collection as jest.Mock).mockImplementation(() =>
        mockCollection()
      );

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'approved' if there is a valid approved request (even without grant)", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [
          {
            data: () => ({
              status: "approved",
              expiresAt: { toDate: () => new Date("2025-01-02T12:00:00Z") },
            }),
          },
        ],
      };

      const mockCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockImplementation((name) => {
            if (name === "accessGrants") {
              return {
                where: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({ docs: [] }),
                }),
              };
            }
            if (name === "accessRequests") {
              return {
                where: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockRequestsSnapshot),
                }),
              };
            }
            return {
              where: jest
                .fn()
                .mockReturnValue({
                  get: jest.fn().mockResolvedValue({ empty: true }),
                }),
            };
          }),
        }),
      });

      (adminDb.collection as jest.Mock).mockImplementation(() =>
        mockCollection()
      );

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("approved");
    });

    it("should return 'none' if approved request is expired", async () => {
      const mockRequestsSnapshot = {
        empty: false,
        docs: [
          {
            data: () => ({
              status: "approved",
              expiresAt: { toDate: () => new Date("2024-12-31T12:00:00Z") },
            }),
          },
        ],
      };

      const mockCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockImplementation((name) => {
            if (name === "accessGrants") {
              return {
                where: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({ docs: [] }),
                }),
              };
            }
            if (name === "accessRequests") {
              return {
                where: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockRequestsSnapshot),
                }),
              };
            }
            return {
              where: jest
                .fn()
                .mockReturnValue({
                  get: jest.fn().mockResolvedValue({ empty: true }),
                }),
            };
          }),
        }),
      });

      (adminDb.collection as jest.Mock).mockImplementation(() =>
        mockCollection()
      );

      const status = await getAccessStatus(mockResumeId, mockRecruiterId);
      expect(status).toBe("none");
    });
  });
});
