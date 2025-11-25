import { POST } from "./route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status: status,
      json: async () => ({
        error: message,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }),
}));

describe("POST /api/resume/create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user123",
    });
  });

  it("should return 401 if unauthorized", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: handleApiError(new Error("Unauthorized"), "Unauthorized", 401),
    });

    const req = new NextRequest("http://localhost/api/resume/create", {
      method: "POST",
      headers: {},
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should create resume successfully", async () => {
    const mockResumeId = 1001;
    const mockBody = { title: "My Resume", content: "..." };

    (generateNumericResumeId as jest.Mock).mockResolvedValue(mockResumeId);

    const mockSet = jest.fn();
    // Need to handle nested collections properly

    // adminDb.collection("users").doc(userId).collection("userResumes").doc(resumeId).set(...)

    const mockUserResumesDoc = { set: mockSet };
    const mockUserResumesCollection = {
      doc: jest.fn().mockReturnValue(mockUserResumesDoc),
    };
    const mockUserDoc = {
      collection: jest.fn().mockReturnValue(mockUserResumesCollection),
    };

    const mockCollection = jest.fn((name) => {
      if (name === "resumes")
        return { doc: jest.fn().mockReturnValue({ set: mockSet }) };
      if (name === "users")
        return { doc: jest.fn().mockReturnValue(mockUserDoc) };
      return { doc: jest.fn() };
    });

    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);

    const req = new NextRequest("http://localhost/api/resume/create", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify(mockBody),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.resumeId).toBe(mockResumeId.toString());
    expect(data.numericId).toBe(mockResumeId);
  });

  it("should handle errors", async () => {
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("DB Error");
    });

    const req = new NextRequest("http://localhost/api/resume/create", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ title: "Test" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Error creating resume");
  });
});
