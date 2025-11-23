import { NextRequest } from "next/server";
import { POST } from "@/app/api/profiles/request-access/route";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

// Mock API Helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status) => {
    return Response.json(
      { error: message || "Error", details: error },
      { status: status || 500 }
    );
  }),
}));

// Mock Notification Service
jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn(),
}));

import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

describe("POST /api/profiles/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create access request successfully when companyName is present", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "recruiter-123",
      error: null,
    });

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: "Recruiter Name",
        companyName: "Tech Corp",
      }),
    };

    const mockResumeDoc = {
      exists: true,
      data: () => ({
        userId: "candidate-456",
      }),
    };

    const mockExistingRequests = {
      empty: true,
      docs: [],
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    };

    const mockRequestRef = {
      id: "request-789",
    };

    const collectionMock = adminDb.collection as jest.Mock;
    collectionMock.mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUserDoc),
          }),
        };
      }
      if (collectionName === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockResumeDoc),
            collection: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue(mockExistingRequests),
              add: jest.fn().mockResolvedValue(mockRequestRef),
            }),
          }),
        };
      }
      if (collectionName === "recruiterMetrics" || collectionName === "jobSeekerMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
          message: "Hello",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-789");
  });

  it("should create access request successfully when legacy company field is present", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "recruiter-123",
      error: null,
    });

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: "Recruiter Name",
        company: "Legacy Corp", // Legacy field
      }),
    };

    const mockResumeDoc = {
      exists: true,
      data: () => ({
        userId: "candidate-456",
      }),
    };

    const mockExistingRequests = {
      empty: true,
      docs: [],
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    };

    const mockRequestRef = {
      id: "request-789",
    };

    const collectionMock = adminDb.collection as jest.Mock;
    collectionMock.mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUserDoc),
          }),
        };
      }
      if (collectionName === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockResumeDoc),
            collection: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue(mockExistingRequests),
              add: jest.fn().mockResolvedValue(mockRequestRef),
            }),
          }),
        };
      }
      if (collectionName === "recruiterMetrics" || collectionName === "jobSeekerMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 403 when company name is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "recruiter-123",
      error: null,
    });

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: "Recruiter Name",
        // No company name
      }),
    };

    const collectionMock = adminDb.collection as jest.Mock;
    collectionMock.mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUserDoc),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Company name is required");
  });

  it("should return 403 when company name is empty string", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "recruiter-123",
      error: null,
    });

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: "Recruiter Name",
        companyName: "   ", // Empty string
      }),
    };

    const collectionMock = adminDb.collection as jest.Mock;
    collectionMock.mockImplementation((collectionName) => {
      if (collectionName === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUserDoc),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Company name is required");
  });
});
