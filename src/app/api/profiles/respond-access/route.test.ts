import { NextRequest } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/notificationService";
import { FieldValue } from "firebase-admin/firestore";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn(),
  },
}));

jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn(),
}));

describe("POST /api/profiles/respond-access", () => {
  const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.Mock;
  const mockCollection = adminDb.collection as jest.Mock;
  const mockCreateNotification = createNotification as jest.Mock;
  const mockIncrement = FieldValue.increment as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: null });

    const request = new NextRequest("http://localhost:3000/api/profiles/respond-access", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid request body", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const request = new NextRequest("http://localhost:3000/api/profiles/respond-access", {
      method: "POST",
      body: JSON.stringify({ requestId: "req1" }), // Missing resumeId and action
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 403 if user does not own the resume", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const mockResumeDoc = {
      exists: true,
      data: () => ({ userId: "otherUser" }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResumeDoc),
      }),
    });

    const request = new NextRequest("http://localhost:3000/api/profiles/respond-access", {
      method: "POST",
      body: JSON.stringify({ requestId: "req1", resumeId: "resume1", action: "approve" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if request not found", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const mockResumeDoc = {
      exists: true,
      data: () => ({ userId: "user123" }),
    };

    const mockRequestDoc = {
      exists: false,
    };

    const mockDoc = jest.fn();
    mockDoc.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(mockResumeDoc) }); // Resume doc
    mockDoc.mockReturnValueOnce({ // Request doc (nested)
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockRequestDoc)
            })
        })
    });
    
    // Fix mocking structure for nested collection
    const mockRequestRef = {
        get: jest.fn().mockResolvedValue(mockRequestDoc)
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockImplementation((id) => {
          if (id === "resume1") {
              return {
                  get: jest.fn().mockResolvedValue(mockResumeDoc),
                  collection: jest.fn().mockReturnValue({
                      doc: jest.fn().mockReturnValue(mockRequestRef)
                  })
              }
          }
          return { get: jest.fn() };
      }),
    });

    const request = new NextRequest("http://localhost:3000/api/profiles/respond-access", {
      method: "POST",
      body: JSON.stringify({ requestId: "req1", resumeId: "resume1", action: "approve" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Request not found");
  });

  it("should successfully approve request and notify recruiter", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const mockResumeDoc = {
      exists: true,
      data: () => ({ userId: "user123", title: "My Resume" }),
    };

    const mockRequestDoc = {
      exists: true,
      data: () => ({ fromUserId: "recruiter1" }),
    };

    const mockRequestUpdate = jest.fn();
    const mockMetricsSet = jest.fn().mockResolvedValue(true);

    mockCollection.mockImplementation((collectionName) => {
        if (collectionName === "resumes") {
            return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue(mockResumeDoc),
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(mockRequestDoc),
                            update: mockRequestUpdate
                        })
                    })
                })
            };
        }
        if (collectionName === "recruiterMetrics") {
            return {
                doc: jest.fn().mockReturnValue({
                    set: mockMetricsSet
                })
            };
        }
        if (collectionName === "jobSeekerMetrics") {
            return {
                doc: jest.fn().mockReturnValue({
                    set: mockMetricsSet
                })
            };
        }
        return {};
    });

    const request = new NextRequest("http://localhost:3000/api/profiles/respond-access", {
      method: "POST",
      body: JSON.stringify({ requestId: "req1", resumeId: "resume1", action: "approve" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRequestUpdate).toHaveBeenCalledWith({ status: "approved" });
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockIncrement).toHaveBeenCalled();
  });
});
