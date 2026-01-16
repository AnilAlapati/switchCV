import { GET } from "@/app/api/jobseeker/access-requests/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/logger");
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
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

describe("JobSeeker Access Requests API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = () => {
    return new NextRequest(
      new URL("http://localhost:3000/api/jobseeker/access-requests"),
      {
        method: "GET",
      }
    );
  };

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = createRequest();
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("should return access requests successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    const mockResumes = [
      {
        id: "resume-1",
        data: () => ({ title: "Resume 1" }),
        ref: {
          collection: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: "request-1",
                    data: () => ({
                      status: "pending",
                      timestamp: { toDate: () => new Date("2023-01-01") },
                      approvedAt: { toDate: () => new Date("2023-01-03") },
                      expiresAt: { toDate: () => new Date("2023-01-10") },
                    }),
                  },
                  {
                    id: "request-2",
                    data: () => ({
                      status: "approved",
                      timestamp: "2023-01-02",
                      approvedAt: "2023-01-03",
                      expiresAt: "2023-01-10",
                    }),
                  },
                ],
                size: 2,
              }),
            })),
          })),
        },
      },
    ];

    (adminDb.collection as jest.Mock).mockReturnValue({
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          docs: mockResumes,
          size: 1,
        }),
      })),
    });

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(2);
    expect(data.requests[0].id).toBe("request-1");
    expect(data.requests[1].approvedAt).toBeDefined();
  });

  it("should handle parsing errors gracefully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    const mockResumes = [
      {
        id: "resume-1",
        data: () => ({ title: "Resume 1" }),
        ref: {
          collection: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: "request-1",
                    data: () => ({
                      status: "pending",
                      timestamp: {
                        toDate: () => {
                          throw new Error("Parse error");
                        },
                      },
                    }),
                  },
                ],
                size: 1,
              }),
            })),
          })),
        },
      },
    ];

    (adminDb.collection as jest.Mock).mockReturnValue({
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          docs: mockResumes,
          size: 1,
        }),
      })),
    });

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
  });

  it("should handle global errors", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch requests");
  });
});
