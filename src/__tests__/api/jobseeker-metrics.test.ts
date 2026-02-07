import { GET } from "@/app/api/jobseeker/metrics/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
      where: jest.fn(() => ({
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

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}));

describe("JobSeeker Metrics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });
  });

  const createRequest = (userId?: string) => {
    const url = userId
      ? `http://localhost:3000/api/jobseeker/metrics?userId=${userId}`
      : "http://localhost:3000/api/jobseeker/metrics";
    return new NextRequest(new URL(url), {
      method: "GET",
    });
  };

  it("should return 400 if userId is missing", async () => {
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    const req = createRequest();
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("should return metrics successfully from existing doc", async () => {
    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            profileViews: 10,
            contactRequests: 5,
            downloads: 2,
            quality: 90,
          }),
        }),
      })),
    });

    const req = createRequest("user-123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profileViews).toBe(10);
    expect(data.contactRequests).toBe(5);
  });

  it("should calculate and save metrics if missing (lazy migration)", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "jobSeekerMetrics") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }
      if (col === "resumes") {
        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [
                  {
                    ref: {
                      collection: jest.fn(() => ({
                        where: jest.fn(() => ({
                          count: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                              data: () => ({ count: 3 }),
                            }),
                          })),
                        })),
                      })),
                    },
                  },
                ],
              }),
            })),
          })),
        };
      }
    });

    const req = createRequest("user-123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contactRequests).toBe(3);
  });

  it("should handle empty resumes in lazy migration", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "jobSeekerMetrics") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }
      if (col === "resumes") {
        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                empty: true,
                docs: [],
              }),
            })),
          })),
        };
      }
    });

    const req = createRequest("user-123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contactRequests).toBe(0);
  });

  it("should handle errors", async () => {
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    const req = createRequest("user-123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch job seeker metrics");
  });
});
