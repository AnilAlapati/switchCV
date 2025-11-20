/* eslint-disable max-lines */
// src/app/api/user/profile/route.test.ts
import { GET, POST, PUT } from "@/app/api/user/profile/route";
import { NextRequest } from "next/server";

// Mock Firebase admin
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

describe("GET /api/user/profile", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error narrowing NextRequest for tests
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as NextRequest;
    Object.defineProperty(mockRequest, "url", {
      value: "http://localhost:3000/api/user/profile?userId=test-user-123",
      writable: true,
    });
  });

  it("should return user profile for authenticated user accessing their own profile", async () => {
    const mockUserId = "test-user-123";
    const mockProfileData = {
      uid: mockUserId,
      email: "test@example.com",
      displayName: "Test User",
      isRecruiter: false,
      subscriptionTier: "basic" as const,
    };

    // Mock authentication
    mockAdminAuth.verifyIdToken.mockResolvedValue({
      uid: mockUserId,
      aud: "test-audience",
      auth_time: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      firebase: { identities: {}, sign_in_provider: "password" },
      iat: Date.now() / 1000,
      iss: "https://securetoken.google.com/test-project",
      sub: mockUserId,
    });

    // Mock database
    const mockDoc = {
      exists: true,
      data: () => mockProfileData,
    };
    const mockDocRef = { get: jest.fn().mockResolvedValue(mockDoc) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    mockRequest.headers.set("Authorization", "Bearer test-token");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProfileData);
    expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith("test-token");
    expect(mockAdminDb.collection).toHaveBeenCalledWith("users");
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
      createMockDecodedToken("test-user-123")
    );
    Object.defineProperty(mockRequest, "url", {
      value: "http://localhost:3000/api/user/profile",
      writable: true,
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("userId is required");
  });

  it("should return 403 when user tries to access another user's profile", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("authenticated-user-123")
    );
    Object.defineProperty(mockRequest, "url", {
      value: "http://localhost:3000/api/user/profile?userId=other-user-456",
      writable: true,
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Cannot access other user's profile");
  });

  it("should return 404 when user profile does not exist", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const mockDoc = { exists: false };
    const mockDocRef = { get: jest.fn().mockResolvedValue(mockDoc) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User profile not found");
  });

  it("should return 500 when database operation fails", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const mockDocRef = {
      get: jest.fn().mockRejectedValue(new Error("Database error")),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch user profile");
  });
});

describe("POST /api/user/profile", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as any;
  });

  it("should create user profile successfully for authenticated user", async () => {
    const mockUserId = "test-user-123";
    const profileData = {
      uid: mockUserId,
      email: "test@example.com",
      displayName: "Test User",
      isRecruiter: true,
      companyName: "Test Company",
      subscriptionTier: "premium" as const,
    };

    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue(profileData);
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken(mockUserId)
    );

    const mockDocRef = { set: jest.fn().mockResolvedValue(undefined) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("User profile created successfully");
    expect(data.data.uid).toBe(mockUserId);
    expect(data.data.createdAt).toBeDefined();
    expect(data.data.updatedAt).toBeDefined();
  });

  it("should create profile with default values when optional fields are missing", async () => {
    const mockUserId = "test-user-123";
    const profileData = {
      uid: mockUserId,
      email: "test@example.com",
    };

    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue(profileData);
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken(mockUserId)
    );

    const mockDocRef = { set: jest.fn().mockResolvedValue(undefined) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.displayName).toBe("");
    expect(data.data.isRecruiter).toBe(false);
    expect(data.data.companyName).toBe("");
    expect(data.data.subscriptionTier).toBe("basic");
  });

  it("should return 401 when not authenticated", async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: "test-user-123",
      email: "test@example.com",
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
  });

  it("should return 400 when uid is missing", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: "test@example.com",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("uid and email are required");
  });

  it("should return 400 when email is missing", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({ uid: "test-user-123" });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("uid and email are required");
  });

  it("should return 403 when user tries to create profile for another user", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: "other-user-456",
      email: "other@example.com",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("authenticated-user-123")
    );

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "Forbidden: Cannot create profiles for other users"
    );
  });

  it("should return 500 when database operation fails", async () => {
    const mockUserId = "test-user-123";
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: mockUserId,
      email: "test@example.com",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken(mockUserId)
    );

    const mockDocRef = {
      set: jest.fn().mockRejectedValue(new Error("Database error")),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create user profile");
  });

  it("should return 500 when request parsing fails", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockRejectedValue(
      new Error("Invalid JSON")
    );
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create user profile");
  });
});

describe("PUT /api/user/profile", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as any;
  });

  it("should update user profile successfully for authenticated user", async () => {
    const mockUserId = "test-user-123";
    const updateData = {
      uid: mockUserId,
      displayName: "Updated Name",
      isRecruiter: true,
      companyName: "New Company",
      subscriptionTier: "premium" as const,
    };

    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue(updateData);
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
    expect(data.message).toBe("User profile updated successfully");
    expect(data.data.displayName).toBe("Updated Name");
    expect(data.data.updatedAt).toBeDefined();
  });

  it("should update only provided fields", async () => {
    const mockUserId = "test-user-123";
    const updateData = {
      uid: mockUserId,
      displayName: "Updated Name",
    };

    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue(updateData);
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken(mockUserId)
    );

    const mockDocRef = { set: jest.fn().mockResolvedValue(undefined) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.displayName).toBe("Updated Name");
    expect(data.data.updatedAt).toBeDefined();
    // Other fields should not be in the update data
    expect(data.data.isRecruiter).toBeUndefined();
  });

  it("should return 401 when not authenticated", async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: "test-user-123",
      displayName: "New Name",
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized: Valid Firebase ID token required");
  });

  it("should return 400 when uid is missing", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      displayName: "New Name",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("uid is required");
  });

  it("should return 403 when user tries to update another user's profile", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: "other-user-456",
      displayName: "New Name",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("authenticated-user-123")
    );

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Cannot update other user's profile");
  });

  it("should return 500 when database operation fails", async () => {
    const mockUserId = "test-user-123";
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      uid: mockUserId,
      displayName: "New Name",
    });
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken(mockUserId)
    );

    const mockDocRef = {
      set: jest.fn().mockRejectedValue(new Error("Database error")),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDocRef) };
    mockAdminDb.collection.mockReturnValue(mockCollection as any);

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update user profile");
  });

  it("should return 500 when request parsing fails", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockRejectedValue(
      new Error("Invalid JSON")
    );
    mockAdminAuth.verifyIdToken.mockResolvedValue(
      createMockDecodedToken("test-user-123")
    );

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update user profile");
  });
});
