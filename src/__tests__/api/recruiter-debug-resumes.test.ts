import { NextRequest } from "next/server";
import { GET } from "@/app/api/recruiter/debug-resumes/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
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

describe("Recruiter Debug Resumes API", () => {
  const mockUserId = "admin-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock admin role check
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin", displayName: "Admin User" }),
            }),
          }),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "resume-1",
              data: () => ({
                userId: "user-1",
                title: "Resume 1",
                published: true,
              }),
            },
          ],
        }),
      };
    });
  });

  it("should fetch all published resumes for admin", async () => {
    const req = new NextRequest("http://localhost/api/recruiter/debug-resumes");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.resumes).toHaveLength(1);
    expect(data.resumes[0].resumeId).toBe("resume-1");
  });

  it("should return 403 if not an admin", async () => {
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter" }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/recruiter/debug-resumes");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
