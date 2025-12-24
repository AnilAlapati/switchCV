import { NextRequest } from "next/server";
import { GET } from "@/app/api/recruiter/requests/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 }
    )
  ),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Requests API", () => {
  const mockUserId = "recruiter-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock user role check
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                role: "recruiter",
                displayName: "Recruiter User",
              }),
            }),
          }),
        };
      }
      if (col === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                userId: "candidate-1",
                title: "Candidate Resume",
              }),
            }),
          }),
        };
      }
      return {};
    });

    (adminDb.collectionGroup as jest.Mock).mockImplementation((col) => {
      if (col === "accessRequests") {
        return {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: "request-1",
                ref: { parent: { parent: { id: "resume-1" } } },
                data: () => ({
                  status: "pending",
                  timestamp: { toDate: () => new Date() },
                }),
              },
            ],
          }),
        };
      }
      return {};
    });
  });

  it("should fetch all requests for a recruiter", async () => {
    const req = new NextRequest("http://localhost/api/recruiter/requests");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].id).toBe("request-1");
    expect(data.requests[0].resumeTitle).toBe("Candidate Resume");
  });

  it("should return 403 if not a recruiter", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "jobseeker" }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/recruiter/requests");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
