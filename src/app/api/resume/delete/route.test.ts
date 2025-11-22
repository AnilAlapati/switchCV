/* eslint-disable max-lines */
import { NextRequest } from "next/server";

// Mock Firebase Admin
jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("@/lib/resumeIdRecycler", () => ({
  addDeletedIdToPool: jest.fn(),
}));

describe("POST /api/resume/delete", () => {
  const mockUserId = "user-123";
  const mockResumeId = "1001";
  const mockToken = "valid-token";

  let POST: any;
  let mockVerifyIdToken: jest.Mock;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockDelete: jest.Mock;
  let mockWhere: jest.Mock;

  let appModule: any;
  let firestoreModule: any;
  let recyclerModule: any;

  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: "test-project",
      FIREBASE_CLIENT_EMAIL: "test@example.com",
      FIREBASE_PRIVATE_KEY: "test-key",
    };

    // Re-require mocks to get the fresh instances used by the re-required module
    // eslint-disable-next-line
    appModule = require("firebase-admin/app");
    // eslint-disable-next-line
    const authModule = require("firebase-admin/auth");
    // eslint-disable-next-line
    firestoreModule = require("firebase-admin/firestore");
    // eslint-disable-next-line
    recyclerModule = require("@/lib/resumeIdRecycler");

    // Setup Firebase Auth mock
    mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: mockUserId });
    authModule.getAuth.mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });

    // Setup Firebase Firestore mock
    mockDelete = jest.fn().mockResolvedValue({});
    mockGet = jest.fn();

    // Create a recursive mock structure for chained calls
    const mockCollectionObj = {
      doc: jest.fn(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockGet,
    };

    const mockDocObj = {
      get: mockGet,
      delete: mockDelete,
      collection: jest.fn(() => mockCollectionObj),
    };

    mockCollectionObj.doc.mockReturnValue(mockDocObj);

    mockDoc = mockCollectionObj.doc as jest.Mock;
    mockCollection = jest.fn(() => mockCollectionObj);
    mockWhere = mockCollectionObj.where as jest.Mock;

    firestoreModule.getFirestore.mockReturnValue({
      collection: mockCollection,
    });

    appModule.getApps.mockReturnValue([]);
    appModule.initializeApp.mockReturnValue({});
    appModule.cert.mockReturnValue({});

    // Re-import the module to reset 'initialized' state
    // eslint-disable-next-line
    const routeModule = require("./route");
    POST = routeModule.POST;
  });
  const createRequest = (body: any, authHeader?: string) => {
    return new NextRequest("http://localhost/api/resume/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  it("should return 400 if resumeId is missing", async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 401 if authorization header is missing", async () => {
    const req = createRequest({ resumeId: mockResumeId });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid token");
  });

  it("should delete resume from 'resumes' collection if found and owned by user", async () => {
    // Mock finding resume in 'resumes' collection
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: mockUserId, numericId: Number(mockResumeId) }),
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBe(Number(mockResumeId));

    // Verify Firestore calls
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockDoc).toHaveBeenCalledWith(mockResumeId);
    expect(mockDelete).toHaveBeenCalled();

    // Verify ID recycling
    expect(recyclerModule.addDeletedIdToPool).toHaveBeenCalledWith(
      Number(mockResumeId)
    );
  });

  it("should return 403 if resume in 'resumes' collection is not owned by user", async () => {
    // Mock finding resume owned by another user
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: "other-user", numericId: Number(mockResumeId) }),
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe(
      "Unauthorized: You can only delete your own resumes"
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("should handle legacy resume not found (snapshot exists but doc does not)", async () => {
    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock found in 'resumeProfiles' via query (numeric ID)
    // But the doc itself doesn't exist (edge case)
    const mockLegacyDoc = {
      ref: {
        delete: mockDelete,
        get: jest.fn().mockResolvedValue({ exists: false }),
      },
    };
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [mockLegacyDoc],
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 403 if legacy resume is not owned by user", async () => {
    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock found in 'resumeProfiles'
    const mockLegacyDoc = {
      ref: {
        delete: mockDelete,
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "other-user",
            numericId: Number(mockResumeId),
          }),
        }),
      },
    };
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [mockLegacyDoc],
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should delete from nested collection if numericId exists", async () => {
    // Mock finding resume in 'resumes' collection
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: mockUserId, numericId: Number(mockResumeId) }),
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    await POST(req);

    // Verify nested delete
    // db.collection("resumes").doc(userId).collection("resumes").doc(String(numericId)).delete()
    // My mock structure:
    // collection("resumes") -> doc(userId) -> collection("resumes") -> doc(numericId) -> delete()

    // Check if the chain was called
    // The first call to collection("resumes") is for the main delete check
    // The second call is for the nested delete

    // Since I'm using the same mock objects, I can check if they were called with specific args
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockDoc).toHaveBeenCalledWith(mockUserId);
    expect(mockDoc).toHaveBeenCalledWith(mockResumeId);
  });

  it("should handle error when recycling ID", async () => {
    // Mock finding resume
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: mockUserId, numericId: Number(mockResumeId) }),
    });

    // Mock recycling error
    recyclerModule.addDeletedIdToPool.mockRejectedValue(
      new Error("Recycle failed")
    );

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    // Should still succeed in deleting
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(recyclerModule.addDeletedIdToPool).toHaveBeenCalled();
  });

  it("should warn if Firebase credentials are missing", async () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, FIREBASE_PROJECT_ID: "" };
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const req = createRequest({ resumeId: mockResumeId });
    await POST(req);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Firebase credentials not configured - API may not work properly"
    );

    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  it("should try 'resumeProfiles' if not found in 'resumes'", async () => {
    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock found in 'resumeProfiles' via query (numeric ID)
    const mockDocData = { userId: mockUserId, numericId: Number(mockResumeId) };
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => mockDocData }],
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBe(Number(mockResumeId));

    // Verify fallback to resumeProfiles
    expect(mockCollection).toHaveBeenCalledWith("resumeProfiles");
    expect(mockWhere).toHaveBeenCalledWith(
      "numericId",
      "==",
      Number(mockResumeId)
    );
  });

  it("should handle initialization error", async () => {
    appModule.initializeApp.mockImplementationOnce(() => {
      throw new Error("Init failed");
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const req = createRequest({ resumeId: mockResumeId });
    await POST(req);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to initialize Firebase Admin:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("should return 404 if resume not found in any collection", async () => {
    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock not found in 'resumeProfiles' (query returns empty)
    mockGet.mockResolvedValueOnce({ empty: true });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return 500 if an internal error occurs", async () => {
    // Mock getFirestore to throw
    firestoreModule.getFirestore.mockImplementationOnce(() => {
      throw new Error("Firestore error");
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error deleting resume:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("should handle legacy resume with non-numeric ID found in resumeProfiles", async () => {
    const nonNumericId = "legacy-abc";

    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock found in 'resumeProfiles' via doc get (not query)
    // Since it's non-numeric, it goes to else block: db.collection("resumeProfiles").doc(resumeId)
    // We need to mock the get() on that doc ref

    // The code does: legacyRef = db.collection("resumeProfiles").doc(String(resumeId));
    // Then: legacySnap = await legacyRef.get();

    // So we need mockDoc to return a doc that has a get() method returning the data
    const mockLegacyData = { userId: mockUserId, numericId: 12345 };
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockLegacyData,
    });

    const req = createRequest(
      { resumeId: nonNumericId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBe(12345);

    // Verify correct collection usage
    expect(mockCollection).toHaveBeenCalledWith("resumeProfiles");
    expect(mockDoc).toHaveBeenCalledWith(nonNumericId);
  });

  it("should return 403 if legacy resume with non-numeric ID is not owned by user", async () => {
    const nonNumericId = "legacy-abc";

    // Mock not found in 'resumes'
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock found in 'resumeProfiles' but wrong owner
    const mockLegacyData = { userId: "other-user", numericId: 12345 };
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockLegacyData,
    });

    const req = createRequest(
      { resumeId: nonNumericId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should skip initialization if already initialized", async () => {
    // Mock success for first call
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: mockUserId, numericId: Number(mockResumeId) }),
    });

    // First call
    const req1 = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    await POST(req1);

    expect(appModule.initializeApp).toHaveBeenCalled();

    // Clear mocks
    appModule.initializeApp.mockClear();

    // Second call
    const req2 = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    await POST(req2);

    // Should not initialize again
    expect(appModule.initializeApp).not.toHaveBeenCalled();
  });

  it("should handle resume with no numeric ID in data or doc ID", async () => {
    const nonNumericId = "abc-def";

    // Mock finding resume in 'resumes' collection
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: mockUserId }), // No numericId in data
    });

    const req = createRequest(
      { resumeId: nonNumericId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.numericId).toBeNull();

    // Verify Firestore calls
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockDoc).toHaveBeenCalledWith(nonNumericId);
    expect(mockDelete).toHaveBeenCalled();

    // Should NOT recycle ID
    expect(recyclerModule.addDeletedIdToPool).not.toHaveBeenCalled();
  });

  it("should handle undefined data in legacy resume", async () => {
    const nonNumericId = "legacy-abc";
    mockGet.mockResolvedValueOnce({ exists: false });

    // Mock legacy found but data() returns undefined
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => undefined,
    });

    const req = createRequest(
      { resumeId: nonNumericId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});
