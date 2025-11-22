import { POST } from "./route";
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]),
  cert: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {},
  adminAuth: {},
}));

jest.mock("@/lib/numericIdGenerator");

describe("POST /api/resumes/create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "user123" }),
    });
  });

  it("should return 400 if required fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 403 if user tries to save for another user", async () => {
    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        userId: "otherUser",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Unauthorized");
  });

  it("should create resume successfully", async () => {
    const mockUserId = "user123";
    const mockNumericId = 1001;
    const mockResume = { title: "My Resume" };

    (generateNumericResumeId as jest.Mock).mockResolvedValue(mockNumericId);

    const mockSet = jest.fn();
    const mockDocRef = { set: mockSet };

    // Mock collection behavior
    const mockCollectionImpl = jest.fn((name) => {
      if (name === "resumes") {
        return { doc: jest.fn().mockReturnValue(mockDocRef) };
      }
      if (name === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
              doc: jest.fn().mockReturnValue(mockDocRef),
            }),
          }),
        };
      }
      if (name === "allResumes") {
        return { doc: jest.fn().mockReturnValue(mockDocRef) };
      }
      return { doc: jest.fn().mockReturnValue(mockDocRef) };
    });

    (getFirestore as jest.Mock).mockReturnValue({
      collection: mockCollectionImpl,
    });

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        userId: mockUserId,
        resume: mockResume,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBe(mockNumericId);
  });

  it("should handle errors", async () => {
    (generateNumericResumeId as jest.Mock).mockRejectedValue(
      new Error("ID Gen Error")
    );

    const req = new NextRequest("http://localhost/api/resumes/create", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        userId: "user123",
        resume: { title: "Resume" },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create resume");
  });
});
