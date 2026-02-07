/**
 * Tests for User Settings API Route
 * Tests GET and PUT operations for user settings
 */
 

import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/user/settings/route";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({ error: message, details: error.message }),
  })),
}));

describe("User Settings API", () => {
  let mockRequest: NextRequest;
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
      url: "http://localhost:3000/api/user/settings",
    } as any;

    // Setup Firestore mocks
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ get: mockGet, set: mockSet });
  });

  describe("GET /api/user/settings", () => {
    it("should return user settings for authenticated user", async () => {
      const mockUserId = "user-123";
      const mockUserData = {
        isRecruiter: true,
        displayName: "John Doe",
        companyName: "Tech Corp",
        settingsUpdatedAt: "2024-01-15T10:30:00Z",
      };

      // Mock authentication
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      // Mock database
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/user/settings?userId=user-123",
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        isRecruiter: true,
        displayName: "John Doe",
        companyName: "Tech Corp",
        notifications: {
          marketing: true,
          security: true,
          activity: false,
        },
        privacy: {
          profilePublic: true,
          searchable: true,
        },
        updatedAt: "2024-01-15T10:30:00Z",
      });
      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockDoc).toHaveBeenCalledWith(mockUserId);
    });

    it("should return 401 when no authorization header is provided", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: {
          status: 401,
          json: async () => ({
            error: "Unauthorized: Valid Firebase ID token required",
          }),
        },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 401 when authorization header is malformed", async () => {
      mockRequest.headers.set("Authorization", "InvalidToken");
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: {
          status: 401,
          json: async () => ({
            error: "Unauthorized: Valid Firebase ID token required",
          }),
        },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 401 when token verification fails", async () => {
      mockRequest.headers.set("Authorization", "Bearer invalid-token");
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: {
          status: 401,
          json: async () => ({
            error: "Unauthorized: Valid Firebase ID token required",
          }),
        },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 400 when userId parameter is missing", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return 403 when user tries to access another user's settings", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "authenticated-user",
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/user/settings?userId=other-user",
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: Cannot access other user's settings");
    });

    it("should return 404 when user does not exist", async () => {
      const mockUserId = "user-123";

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockGet.mockResolvedValue({ exists: false });

      const request = new NextRequest(
        "http://localhost:3000/api/user/settings?userId=user-123",
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return default settings when user data is missing fields", async () => {
      const mockUserId = "user-123";
      const mockUserData = {}; // Empty user data

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/user/settings?userId=user-123",
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isRecruiter).toBe(false);
      expect(data.displayName).toBe("");
      expect(data.companyName).toBe("");
      expect(data.updatedAt).toBeDefined();
    });

    it("should return 500 when database operation fails", async () => {
      const mockUserId = "user-123";

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockGet.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/user/settings?userId=user-123",
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch settings");
    });
  });

  describe("PUT /api/user/settings", () => {
    it("should update user settings successfully for authenticated user", async () => {
      const mockUserId = "user-123";
      const settingsData = {
        userId: mockUserId,
        isRecruiter: true,
        companyName: "Tech Corp",
        displayName: "John Doe",
      };

      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockResolvedValue(settingsData);

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockSet.mockResolvedValue(undefined);

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Settings updated successfully");
      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockDoc).toHaveBeenCalledWith(mockUserId);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          isRecruiter: true,
          companyName: "Tech Corp",
          displayName: "John Doe",
          settingsUpdatedAt: expect.any(String),
        }),
        { merge: true }
      );
    });

    it("should return 401 when not authenticated", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        userId: "user-123",
        displayName: "John Doe",
      });

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: {
          status: 401,
          json: async () => ({
            error: "Unauthorized: Valid Firebase ID token required",
          }),
        },
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 400 when request body is invalid", async () => {
      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new Error("Invalid JSON")
      );

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON in request body");
    });

    it("should return 400 when userId is missing", async () => {
      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockResolvedValue({
        displayName: "John Doe",
      });

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return 403 when user tries to update another user's settings", async () => {
      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockResolvedValue({
        userId: "other-user",
        displayName: "John Doe",
      });

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "authenticated-user",
        error: null,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: Cannot update other user's settings");
    });

    it("should update partial settings and preserve existing values", async () => {
      const mockUserId = "user-123";
      const partialSettings = {
        userId: mockUserId,
        displayName: "Jane Doe",
      };

      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockResolvedValue(partialSettings);

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockSet.mockResolvedValue(undefined);

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Settings updated successfully");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "Jane Doe",
          settingsUpdatedAt: expect.any(String),
        }),
        { merge: true }
      );
    });

    it("should return 500 when database operation fails", async () => {
      const mockUserId = "user-123";
      const settingsData = {
        userId: mockUserId,
        displayName: "John Doe",
      };

      mockRequest.headers.set("Authorization", "Bearer test-token");
      (mockRequest.json as jest.Mock).mockResolvedValue(settingsData);

      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        error: null,
      });

      mockSet.mockRejectedValue(new Error("Database error"));

      const response = await PUT(mockRequest);

      expect(response.status).toBe(500);
    });
  });
});
