/**
 * Tests for /api/admin/migrate-resume-ids route
 */

import { POST } from "@/app/api/admin/migrate-resume-ids/route";
import { adminDb } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  mapResumeId: jest.fn(),
}));

describe("POST /api/admin/migrate-resume-ids", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully migrate resume IDs", async () => {
    const mockResumes = [
      {
        id: "doc1",
        data: () => ({
          userId: "user1",
          title: "Resume 1",
          published: true,
        }),
      },
      {
        id: "doc2",
        data: () => ({
          userId: "user2",
          title: "Resume 2",
          published: true,
        }),
      },
    ];

    const mockCounterDoc = {
      exists: true,
      data: () => ({ nextId: 5 }),
    };

    // Mock resumes collection query
    const mockResumesQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        size: 2,
        docs: mockResumes,
      }),
    };

    // Mock system collection and counter doc
    const mockCounterSet = jest.fn();
    const mockCounterRef = {
      get: jest.fn().mockResolvedValue(mockCounterDoc),
      set: mockCounterSet,
    };

    const mockSystemCollection = {
      doc: jest.fn().mockReturnValue(mockCounterRef),
    };

    // Mock adminDb.collection to return different objects based on collection name
    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return mockResumesQuery;
      } else if (collectionName === "system") {
        return mockSystemCollection;
      }
      return {};
    });

    (mapResumeId as jest.Mock).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Migration completed");
    expect(data.totalResumes).toBe(2);
    expect(data.migrated).toBe(2);
    expect(data.nextId).toBe(8); // 5 + 1 + 2 migrated
    expect(data.mappings).toHaveLength(2);
    expect(data.mappings[0]).toEqual({
      resumeId: 6,
      documentId: "doc1",
      userId: "user1",
      title: "Resume 1",
    });
    expect(data.mappings[1]).toEqual({
      resumeId: 7,
      documentId: "doc2",
      userId: "user2",
      title: "Resume 2",
    });

    expect(mapResumeId).toHaveBeenCalledTimes(2);
    expect(mapResumeId).toHaveBeenNthCalledWith(1, 6, "doc1", "user1");
    expect(mapResumeId).toHaveBeenNthCalledWith(2, 7, "doc2", "user2");

    expect(mockCounterSet).toHaveBeenCalledWith({ nextId: 8 }, { merge: true });
  });

  it("should handle counter document not existing", async () => {
    const mockResumes = [
      {
        id: "doc1",
        data: () => ({
          userId: "user1",
          title: "Resume 1",
          published: true,
        }),
      },
    ];

    const mockCounterDoc = {
      exists: false,
      data: () => ({}),
    };

    // Mock resumes collection query
    const mockResumesQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        size: 1,
        docs: mockResumes,
      }),
    };

    // Mock system collection and counter doc
    const mockCounterSet = jest.fn();
    const mockCounterRef = {
      get: jest.fn().mockResolvedValue(mockCounterDoc),
      set: mockCounterSet,
    };

    const mockSystemCollection = {
      doc: jest.fn().mockReturnValue(mockCounterRef),
    };

    // Mock adminDb.collection to return different objects based on collection name
    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return mockResumesQuery;
      } else if (collectionName === "system") {
        return mockSystemCollection;
      }
      return {};
    });

    (mapResumeId as jest.Mock).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(1);
    expect(data.nextId).toBe(2); // 1 + 1 migrated

    expect(mapResumeId).toHaveBeenCalledWith(1, "doc1", "user1");
    expect(mockCounterSet).toHaveBeenCalledWith({ nextId: 2 }, { merge: true });
  });

  it("should handle mapResumeId failure for individual resume", async () => {
    const mockResumes = [
      {
        id: "doc1",
        data: () => ({
          userId: "user1",
          title: "Resume 1",
          published: true,
        }),
      },
      {
        id: "doc2",
        data: () => ({
          userId: "user2",
          title: "Resume 2",
          published: true,
        }),
      },
    ];

    const mockCounterDoc = {
      exists: true,
      data: () => ({ nextId: 5 }),
    };

    // Mock resumes collection query
    const mockResumesQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        size: 2,
        docs: mockResumes,
      }),
    };

    // Mock system collection and counter doc
    const mockCounterSet = jest.fn();
    const mockCounterRef = {
      get: jest.fn().mockResolvedValue(mockCounterDoc),
      set: mockCounterSet,
    };

    const mockSystemCollection = {
      doc: jest.fn().mockReturnValue(mockCounterRef),
    };

    // Mock adminDb.collection to return different objects based on collection name
    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return mockResumesQuery;
      } else if (collectionName === "system") {
        return mockSystemCollection;
      }
      return {};
    });

    // First call succeeds, second fails
    (mapResumeId as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Mapping failed"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalResumes).toBe(2);
    expect(data.migrated).toBe(1); // Only one succeeded
    expect(data.mappings).toHaveLength(1);
    expect(data.nextId).toBe(7); // Still incremented for failed mapping

    expect(mapResumeId).toHaveBeenCalledTimes(2);
    expect(mockCounterSet).toHaveBeenCalledWith({ nextId: 7 }, { merge: true });
  });

  it("should handle no published resumes", async () => {
    const mockCounterDoc = {
      exists: true,
      data: () => ({ nextId: 5 }),
    };

    // Mock resumes collection query
    const mockResumesQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        size: 0,
        docs: [],
      }),
    };

    // Mock system collection and counter doc
    const mockCounterSet = jest.fn();
    const mockCounterRef = {
      get: jest.fn().mockResolvedValue(mockCounterDoc),
      set: mockCounterSet,
    };

    const mockSystemCollection = {
      doc: jest.fn().mockReturnValue(mockCounterRef),
    };

    // Mock adminDb.collection to return different objects based on collection name
    (adminDb.collection as jest.Mock).mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return mockResumesQuery;
      } else if (collectionName === "system") {
        return mockSystemCollection;
      }
      return {};
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalResumes).toBe(0);
    expect(data.migrated).toBe(0);
    expect(data.mappings).toHaveLength(0);
    expect(data.nextId).toBe(6); // 5 + 1

    expect(mapResumeId).not.toHaveBeenCalled();
    expect(mockCounterSet).toHaveBeenCalledWith({ nextId: 6 }, { merge: true });
  });

  it("should handle database error", async () => {
    const mockError = new Error("Database connection failed");
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw mockError;
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");
    expect(data.details).toBe("Error: Database connection failed");
  });

  it("should handle unknown error", async () => {
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw "Unknown error";
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Migration failed");
    expect(data.details).toBe("Unknown error");
  });
});
