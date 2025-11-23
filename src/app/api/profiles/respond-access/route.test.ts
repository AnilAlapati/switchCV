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
    serverTimestamp: jest.fn(() => "SERVER_TS"),
  },
  Timestamp: {
    fromDate: jest.fn((date) => ({
      toDate: () => date,
    })),
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

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid request body", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({ requestId: "req1" }), // Missing resumeId and action
      }
    );

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

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

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

    const mockRequestRef = {
      get: jest.fn().mockResolvedValue(mockRequestDoc),
    };

    mockCollection.mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockResumeDoc),
            collection: jest.fn().mockImplementation((subName: string) => {
              if (subName === "accessRequests") {
                return {
                  doc: jest.fn().mockReturnValue(mockRequestRef),
                };
              }
              return {};
            }),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Request not found");
  });

  const buildApprovedRequest = () => ({
    exists: true,
    data: () => ({
      fromUserId: "recruiter1",
      requestedDuration: {
        preset: "1_month",
        value: 1,
        unit: "month",
        durationHours: 720,
        durationMs: 720 * 60 * 60 * 1000,
        label: "1 Month",
        timezone: "UTC",
        isCustom: false,
      },
    }),
  });

  const setupApprovalMocks = () => {
    const mockResumeSnapshot = {
      exists: true,
      data: () => ({ userId: "user123", title: "My Resume" }),
    };

    const mockRequestDoc = buildApprovedRequest();
    const mockRequestRef = {
      get: jest.fn().mockResolvedValue(mockRequestDoc),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const mockAccessGrantsCollection = {
      add: jest.fn().mockResolvedValue({ id: "grant1" }),
    };

    mockCollection.mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockResumeSnapshot),
            collection: jest.fn().mockImplementation((subName: string) => {
              if (subName === "accessRequests") {
                return {
                  doc: jest.fn().mockReturnValue(mockRequestRef),
                };
              }
              if (subName === "accessGrants") {
                return mockAccessGrantsCollection;
              }
              return {};
            }),
          }),
        };
      }
      if (collectionName === "recruiterMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(true),
          }),
        };
      }
      if (collectionName === "jobSeekerMetrics") {
        return {
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(true),
          }),
        };
      }
      return { doc: jest.fn() };
    });

    return { mockRequestRef, mockAccessGrantsCollection };
  };

  it("should successfully approve request, store grant, and notify recruiter", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    const { mockRequestRef, mockAccessGrantsCollection } = setupApprovalMocks();

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRequestRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        grantedDuration: expect.objectContaining({ label: "1 Month" }),
        expiresAt: expect.any(Object),
      })
    );
    expect(mockAccessGrantsCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.objectContaining({ label: "1 Month" }),
      })
    );
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockIncrement).toHaveBeenCalled();
  });

  it("should reject approvals longer than requested", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    setupApprovalMocks();

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
          grantDuration: { preset: "custom_days", customDays: 400 },
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("duration");
  });

  it("should honor custom overrides within requested duration", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({ userId: "user123" });
    const { mockRequestRef } = setupApprovalMocks();

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/respond-access",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "req1",
          resumeId: "resume1",
          action: "approve",
          grantDuration: { preset: "custom_days", customDays: 10 },
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRequestRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        grantedDuration: expect.objectContaining({ label: "10 Days" }),
      })
    );
  });
});
