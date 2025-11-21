import { POST } from "./route";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";

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

describe("POST /api/resume/create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthorized", async () => {
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
    const mockUserId = "user123";
    const mockResumeId = 1001;
    const mockBody = { title: "My Resume", content: "..." };

    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
      uid: mockUserId,
    });
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
    (adminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
      new Error("Auth Error")
    );

    const req = new NextRequest("http://localhost/api/resume/create", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
