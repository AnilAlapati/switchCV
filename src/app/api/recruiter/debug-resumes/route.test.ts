/**
 * @jest-environment node
 */

import { GET } from "./route";

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

import { adminDb } from "@/lib/firebase-admin";

const mockCollection = adminDb.collection as jest.Mock;
const mockResumesCollection = {
  where: jest.fn(),
};
const mockUsersCollection = {
  doc: jest.fn(),
};

describe("GET /api/recruiter/debug-resumes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the mock chain for resumes collection
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
    });

    // Setup the mock chain for users collection
    mockUsersCollection.doc.mockReturnValue({
      get: jest.fn(),
    });

    // Mock collection to return different objects based on collection name
    mockCollection.mockImplementation((collectionName) => {
      if (collectionName === "resumes") {
        return mockResumesCollection;
      } else if (collectionName === "users") {
        return mockUsersCollection;
      }
      return {};
    });
  });

  it("should return published resumes with user data successfully", async () => {
    const mockResumeDoc1 = {
      id: "resume-1",
      data: () => ({
        userId: "user-1",
        title: "Software Engineer Resume",
        published: true,
        createdAt: new Date("2024-01-01"),
      }),
    };

    const mockResumeDoc2 = {
      id: "resume-2",
      data: () => ({
        userId: "user-2",
        title: "Product Manager Resume",
        published: true,
        createdAt: new Date("2024-01-02"),
      }),
    };

    const mockUserDoc1 = {
      exists: true,
      data: () => ({
        displayName: "John Doe",
        email: "john@example.com",
      }),
    };

    const mockUserDoc2 = {
      exists: true,
      data: () => ({
        displayName: null,
        email: "jane@example.com",
      }),
    };

    // Mock resumes query
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [mockResumeDoc1, mockResumeDoc2],
        }),
      }),
    });

    // Mock user queries
    mockUsersCollection.doc.mockImplementation((userId) => ({
      get: jest
        .fn()
        .mockResolvedValue(userId === "user-1" ? mockUserDoc1 : mockUserDoc2),
    }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("All published resumes");
    expect(data.total).toBe(2);
    expect(data.resumes).toHaveLength(2);

    expect(data.resumes[0].resumeId).toBe("resume-1");
    expect(data.resumes[0].title).toBe("Software Engineer Resume");
    expect(data.resumes[0].userId).toBe("user-1");
    expect(data.resumes[0].userName).toBe("John Doe");
    expect(data.resumes[0].published).toBe(true);
    expect(data.resumes[0].createdAt).toBe("2024-01-01T00:00:00.000Z");

    expect(data.resumes[1].resumeId).toBe("resume-2");
    expect(data.resumes[1].title).toBe("Product Manager Resume");
    expect(data.resumes[1].userId).toBe("user-2");
    expect(data.resumes[1].userName).toBe("jane@example.com"); // Should use email when displayName is null
    expect(data.resumes[1].published).toBe(true);
    expect(data.resumes[1].createdAt).toBe("2024-01-02T00:00:00.000Z");

    expect(mockResumesCollection.where).toHaveBeenCalledWith(
      "published",
      "==",
      true
    );
    expect(mockCollection).toHaveBeenCalledWith("resumes");
    expect(mockCollection).toHaveBeenCalledWith("users");
  });

  it("should handle resumes without titles", async () => {
    const mockResumeDoc = {
      id: "resume-1",
      data: () => ({
        userId: "user-1",
        published: true,
        createdAt: new Date("2024-01-01"),
        // No title field
      }),
    };

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: "John Doe",
        email: "john@example.com",
      }),
    };

    // Mock resumes query
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [mockResumeDoc],
        }),
      }),
    });

    // Mock user query
    mockUsersCollection.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockUserDoc),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resumes[0].title).toBe("Untitled"); // Should default to "Untitled"
  });

  it("should handle users that don't exist", async () => {
    const mockResumeDoc = {
      id: "resume-1",
      data: () => ({
        userId: "non-existent-user",
        title: "Test Resume",
        published: true,
        createdAt: new Date("2024-01-01"),
      }),
    };

    // Mock resumes query
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [mockResumeDoc],
        }),
      }),
    });

    // Mock user query - user doesn't exist
    mockUsersCollection.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: false,
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resumes[0].userName).toBe("Unknown"); // Should default to "Unknown"
  });

  it("should handle users with no displayName or email", async () => {
    const mockResumeDoc = {
      id: "resume-1",
      data: () => ({
        userId: "user-1",
        title: "Test Resume",
        published: true,
        createdAt: new Date("2024-01-01"),
      }),
    };

    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: null,
        email: null,
      }),
    };

    // Mock resumes query
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [mockResumeDoc],
        }),
      }),
    });

    // Mock user query
    mockUsersCollection.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockUserDoc),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resumes[0].userName).toBe("Unknown"); // Should default to "Unknown"
  });

  it("should return empty array when no published resumes exist", async () => {
    // Mock empty resumes query
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("All published resumes");
    expect(data.total).toBe(0);
    expect(data.resumes).toEqual([]);
  });

  it("should handle database errors", async () => {
    // Mock database error
    mockResumesCollection.where.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch resumes");
  });
});
