/* eslint-disable max-lines */
// src/app/api/user/profile/route.test.ts
import { GET, POST, PUT } from "@/app/api/user/profile/route";
import { NextRequest } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock Firebase admin
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

describe("GET /api/user/profile", () => {
  let mockRequest: NextRequest;
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();

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

    // Setup Firestore mocks
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ get: mockGet, set: mockSet });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    // Mock database
    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockProfileData,
    });

    mockRequest.headers.set("Authorization", "Bearer test-token");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProfileData);
    expect(mockCollection).toHaveBeenCalledWith("users");
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
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "authenticated-user-123",
      error: null,
    });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

    mockGet.mockResolvedValue({ exists: false });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User profile not found");
  });

  it("should return 500 when database operation fails", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

    mockGet.mockRejectedValue(new Error("Database error"));

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch user profile");
  });
});

describe("POST /api/user/profile", () => {
  let mockRequest: NextRequest;
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as any;

    // Setup Firestore mocks
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ set: mockSet });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockResolvedValue(undefined);

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockResolvedValue(undefined);

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

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: {
        status: 401,
        json: async () => ({
          error: "Unauthorized: Valid Firebase ID token required",
        }),
      },
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("uid and email are required");
  });

  it("should return 400 when email is missing", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({ uid: "test-user-123" });
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "authenticated-user-123",
      error: null,
    });

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockRejectedValue(new Error("Database error"));

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create user profile");
  });
});

describe("PUT /api/user/profile", () => {
  let mockRequest: NextRequest;
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as any;

    // Setup Firestore mocks
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ set: mockSet });
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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockResolvedValue(undefined);

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockResolvedValue(undefined);

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

  it("should return 400 when uid is missing", async () => {
    mockRequest.headers.set("Authorization", "Bearer test-token");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      displayName: "New Name",
    });
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "authenticated-user-123",
      error: null,
    });

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      error: null,
    });

    mockSet.mockRejectedValue(new Error("Database error"));

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
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-123",
      error: null,
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update user profile");
  });
});
