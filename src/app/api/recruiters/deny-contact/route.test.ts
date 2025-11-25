import { NextRequest } from "next/server";
import { POST } from "./route";
import { doc, updateDoc, getDoc, addDoc, collection } from "firebase/firestore";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
}));

jest.mock("@/lib/firebase", () => ({
  db: "mock-db",
}));

describe("POST /api/recruiters/deny-contact", () => {
  let mockGetDoc: jest.Mock;
  let mockUpdateDoc: jest.Mock;
  let mockAddDoc: jest.Mock;
  let mockDoc: jest.Mock;
  let mockCollection: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetDoc = getDoc as jest.Mock;
    mockUpdateDoc = updateDoc as jest.Mock;
    mockAddDoc = addDoc as jest.Mock;
    mockDoc = doc as jest.Mock;
    mockCollection = collection as jest.Mock;

    // Default mocks
    mockDoc.mockReturnValue("mock-doc-ref");
    mockCollection.mockReturnValue("mock-collection-ref");
  });

  describe("Validation", () => {
    it("should return 400 when requestId is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      // expect(data.required).toEqual(["requestId", "reason", "adminUserId"]);
    });

    it("should return 400 when reason is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      // expect(data.required).toEqual(["requestId", "reason", "adminUserId"]);
    });

    it("should return 400 when adminUserId is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      // expect(data.required).toEqual(["requestId", "reason", "adminUserId"]);
    });

    it("should return 400 when request body is invalid JSON", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });
  });

  describe("Request Processing", () => {
    it("should return 404 when request does not exist", async () => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "nonexistent-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Request not found");
      expect(mockGetDoc).toHaveBeenCalledWith("mock-doc-ref");
      expect(mockDoc).toHaveBeenCalledWith(
        "mock-db",
        "recruiterRequests",
        "nonexistent-123"
      );
    });

    it("should return 400 when request is already processed", async () => {
      const mockRequestData = {
        status: "approved",
        fromRecruiter: {
          recruiterId: "recruiter-123",
          email: "recruiter@test.com",
        },
        toUserId: "user-456",
        toUserEmail: "user@test.com",
      };

      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockRequestData),
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Request is already approved");
      // expect(data.status).toBe("approved");
    });
  });

  describe("Successful Denial", () => {
    const mockRequestData = {
      status: "pending",
      fromRecruiter: {
        recruiterId: "recruiter-123",
        email: "recruiter@test.com",
      },
      toUserId: "user-456",
      toUserEmail: "user@test.com",
    };

    beforeEach(() => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockRequestData),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "notification-123" });
    });

    it("should successfully deny contact request and create notification", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Candidate not interested in opportunities",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requestId).toBe("req-123");
      expect(data.status).toBe("denied");
      expect(data.message).toBe("Request denied. Recruiter has been notified.");

      // Verify request update
      expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        status: "denied",
        updatedAt: "mock-timestamp",
        reviewedBy: "admin-123",
        reviewedAt: "mock-timestamp",
        denialReason: "Candidate not interested in opportunities",
      });

      // Verify notification creation
      expect(mockAddDoc).toHaveBeenCalledTimes(2); // Notification and audit log

      // Check notification call
      expect(mockAddDoc).toHaveBeenNthCalledWith(1, "mock-collection-ref", {
        type: "contact_request_denied",
        recruiterId: "recruiter-123",
        requestId: "req-123",
        candidateId: "user-456",
        reason: "Candidate not interested in opportunities",
        deniedAt: "mock-timestamp",
        message:
          "Your request to contact user@test.com has been denied. Reason: Candidate not interested in opportunities",
        timestamp: "mock-timestamp",
        read: false,
        actionUrl: "/recruiter/portal/requests/req-123",
      });

      // Check audit log call
      expect(mockAddDoc).toHaveBeenNthCalledWith(2, "mock-collection-ref", {
        action: "contact_request_denied",
        requestId: "req-123",
        recruiterId: "recruiter-123",
        recruiterEmail: "recruiter@test.com",
        candidateId: "user-456",
        adminUserId: "admin-123",
        denialReason: "Candidate not interested in opportunities",
        timestamp: "mock-timestamp",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors during request fetch", async () => {
      mockGetDoc.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Database connection failed");
    });

    it("should handle database errors during request update", async () => {
      const mockRequestData = {
        status: "pending",
        fromRecruiter: {
          recruiterId: "recruiter-123",
          email: "recruiter@test.com",
        },
        toUserId: "user-456",
        toUserEmail: "user@test.com",
      };

      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockRequestData),
      });
      mockUpdateDoc.mockRejectedValue(new Error("Update failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Update failed");
    });

    it("should handle notification creation errors gracefully", async () => {
      const mockRequestData = {
        status: "pending",
        fromRecruiter: {
          recruiterId: "recruiter-123",
          email: "recruiter@test.com",
        },
        toUserId: "user-456",
        toUserEmail: "user@test.com",
      };

      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockRequestData),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockRejectedValue(new Error("Notification failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Notification failed");
    });

    it("should handle unknown errors", async () => {
      mockGetDoc.mockRejectedValue("Unknown error");

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Unknown error");
    });
  });
});
