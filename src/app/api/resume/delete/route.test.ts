/* eslint-disable max-lines */
import { NextRequest } from "next/server";

// Mock Firebase Admin
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();

const mockCollectionObj = {
  doc: mockDoc,
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
};

const mockDocObj = {
  get: mockGet,
  delete: mockDelete,
  collection: mockCollection,
};

// Setup chain
mockCollection.mockReturnValue(mockCollectionObj);
mockDoc.mockReturnValue(mockDocObj);
mockWhere.mockReturnValue(mockCollectionObj);
mockLimit.mockReturnValue(mockCollectionObj);

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mockCollection,
  },
}));

jest.mock("@/lib/resumeIdRecycler", () => ({
  addDeletedIdToPool: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status,
      json: async () => ({ error: message }),
    };
  }),
}));

describe("POST /api/resume/delete", () => {
  const mockUserId = "user-123";
  const mockResumeId = "1001";
  const mockToken = "valid-token";

  let POST: any;
  let recyclerModule: any;
  let apiHelpersModule: any;

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

    // Re-require mocks
    // eslint-disable-next-line
    recyclerModule = require("@/lib/resumeIdRecycler");
    // eslint-disable-next-line
    apiHelpersModule = require("@/lib/utils/api-helpers");

    // Setup api-helpers mock
    apiHelpersModule.getAuthenticatedUserId.mockResolvedValue({
      userId: mockUserId,
    });

    // Reset mock implementations
    mockDelete.mockResolvedValue({});
    mockGet.mockReset();
    mockCollection.mockClear();
    mockDoc.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();

    // Re-setup chain defaults
    mockCollection.mockReturnValue(mockCollectionObj);
    mockDoc.mockReturnValue(mockDocObj);
    mockWhere.mockReturnValue(mockCollectionObj);
    mockLimit.mockReturnValue(mockCollectionObj);

    // Re-import the module
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
    apiHelpersModule.getAuthenticatedUserId.mockResolvedValue({
      userId: null,
      error: {
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      },
    });
    const req = createRequest({ resumeId: mockResumeId });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if token is invalid", async () => {
    apiHelpersModule.getAuthenticatedUserId.mockResolvedValue({
      userId: null,
      error: {
        status: 401,
        json: async () => ({ error: "Invalid token" }),
      },
    });
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

  it("should delete from the primary collection and recycle numeric IDs", async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: mockUserId, numericId: Number(mockResumeId) }),
    });

    const req = createRequest(
      { resumeId: mockResumeId },
      `Bearer ${mockToken}`
    );
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockDoc).toHaveBeenCalledWith(mockResumeId);
    expect(mockDelete).toHaveBeenCalled();
    expect(recyclerModule.addDeletedIdToPool).toHaveBeenCalledWith(
      Number(mockResumeId)
    );
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
    // Mock collection to throw
    mockCollection.mockImplementationOnce(() => {
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
    expect(data.error).toBe("Error deleting resume");
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
