import { NextRequest } from "next/server";
import { POST } from "@/app/api/profiles/request-access/route";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
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

const baseRequestBody = {
  resumeId: "resume-123",
  duration: {
    preset: "1_week" as const,
  },
  timezone: "UTC",
};

describe("POST /api/profiles/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  const mockRequestRef = {
    id: "request-789",
  };

  const accessRequestsCollectionMock = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
    add: jest.fn().mockResolvedValue(mockRequestRef),
  };

  const accessGrantsCollectionMock = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  };

  const setupMocks = () => {
    (adminDb.collectionGroup as jest.Mock).mockImplementation((collectionName) => {
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
      };
    });

    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
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
            collection: jest.fn((subCollectionName) => {
              if (subCollectionName === "accessRequests") return accessRequestsCollectionMock;
              if (subCollectionName === "accessGrants") return accessGrantsCollectionMock;
              return { get: jest.fn() };
            }),
          }),
        };
      }
      return { doc: jest.fn().mockReturnValue({ set: jest.fn() }) };
    });
  };

  it("should create access request successfully when companyName is present", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "recruiter-123",
      error: null,
    });
    setupMocks();

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          ...baseRequestBody,
          message: "Hello",
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

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ displayName: "Recruiter" }),
            }),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/request-access",
      {
        method: "POST",
        body: JSON.stringify(baseRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Access request limit reached or missing company info");
  });

});

