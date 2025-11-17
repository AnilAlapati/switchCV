/**
 * Tests for User Settings API Route
 * Tests GET and PUT operations for user settings
 */
/* eslint-disable max-lines */

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/user/settings/route";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockAdminAuth = adminAuth as jest.Mocked<typeof adminAuth>;

const createMockDecodedToken = (uid: string) => ({
  uid,
  aud: "test-audience",
  auth_time: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  firebase: { identities: {}, sign_in_provider: "password" },
  iat: Date.now() / 1000,
  iss: "https://securetoken.google.com/test-project",
  sub: uid,
});

describe("User Settings API", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
      url: "http://localhost:3000/api/user/settings",
    } as any;
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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      // Mock database
      const mockDoc = {
        exists: true,
        data: () => mockUserData,
      };
      const mockDocRef = { get: jest.fn().mockResolvedValue(mockDoc) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

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
        updatedAt: "2024-01-15T10:30:00Z",
      });
      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith("test-token");
      expect(mockAdminDb.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.doc).toHaveBeenCalledWith(mockUserId);
    });

    it("should return 401 when no authorization header is provided", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
      expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is malformed", async () => {
      mockRequest.headers.set("Authorization", "InvalidToken");
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 401 when token verification fails", async () => {
      mockRequest.headers.set("Authorization", "Bearer invalid-token");
      mockAdminAuth.verifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
    });

    it("should return 400 when userId parameter is missing", async () => {
      mockRequest.headers.set("Authorization", "Bearer test-token");
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken("user-123")
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return 403 when user tries to access another user's settings", async () => {
      mockRequest.headers.set("Authorization", "Bearer test-token");
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken("authenticated-user")
      );

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

      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDoc = { exists: false };
      const mockDocRef = { get: jest.fn().mockResolvedValue(mockDoc) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

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

      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDoc = {
        exists: true,
        data: () => mockUserData,
      };
      const mockDocRef = { get: jest.fn().mockResolvedValue(mockDoc) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

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

      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDocRef = {
        get: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDocRef = { set: jest.fn().mockResolvedValue(undefined) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Settings updated successfully");
      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith("test-token");
      expect(mockAdminDb.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.doc).toHaveBeenCalledWith(mockUserId);
      expect(mockDocRef.set).toHaveBeenCalledWith(
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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken("user-123")
      );

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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken("user-123")
      );

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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken("authenticated-user")
      );

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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDocRef = { set: jest.fn().mockResolvedValue(undefined) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Settings updated successfully");
      expect(mockDocRef.set).toHaveBeenCalledWith(
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
      mockAdminAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(mockUserId)
      );

      const mockDocRef = {
        set: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
      mockAdminDb.collection.mockReturnValue(mockCollection as any);

      const response = await PUT(mockRequest);

      expect(response.status).toBe(500);
    });
  });
});
