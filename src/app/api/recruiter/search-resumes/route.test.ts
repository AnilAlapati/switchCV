/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
      get: jest.fn(),
    })),
  },
}));

// Mock resume ID mapping
jest.mock("@/lib/resumeIdMapping", () => ({
  getDocumentIdFromResumeId: jest.fn(),
}));

// Mock userService
jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

import { adminDb } from "@/lib/firebase-admin";
import { getDocumentIdFromResumeId } from "@/lib/resumeIdMapping";
import { getUserTier } from "@/lib/services/userService";

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockGetDocumentIdFromResumeId =
  getDocumentIdFromResumeId as jest.MockedFunction<
    typeof getDocumentIdFromResumeId
  >;
const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;

// Helper to create mock document snapshots
const createMockDocSnapshot = (exists: boolean, data?: any) => ({
  exists,
  data: () => data,
  id: exists ? "mock-doc-id" : "",
});

const createMockQuerySnapshot = (docs: any[]) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback: (doc: any) => void) => docs.forEach(callback),
});

describe("POST /api/recruiter/search-resumes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Tier", () => {
    it("should return 400 when recruiterId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("recruiterId is required");
    });

    // Note: Recruiter existence is no longer checked - getUserTier returns 'basic' by default

    it("should return 400 when no search parameters provided", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      mockAdminDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, {})),
          set: jest.fn().mockResolvedValue(undefined),
        })),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({ recruiterId: "recruiter-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Please provide either a userId or skills/location for search");
    });

    it("should search by resume ID mapping successfully", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      const resumeDoc = createMockDocSnapshot(true, {
        title: "Software Engineer Resume",
        userId: "user-456",
        published: true,
        createdAt: "2024-01-15T10:00:00Z",
      });
      const userDoc = createMockDocSnapshot(true, {
        displayName: "John Doe",
        email: "john@example.com",
      });

      mockGetDocumentIdFromResumeId.mockResolvedValue({
        documentId: "doc-123",
        userId: "user-456",
      });

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(userDoc),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(resumeDoc),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            userId: "resume-12345",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0]).toEqual({
        resumeId: "resume-12345",
        title: "Software Engineer Resume",
        userName: "John Doe",
        userId: "user-456",
        createdAt: "2024-01-15T10:00:00Z",
        accessStatus: "none",
      });
      expect(data.tier).toBe("basic");
      expect(data.maxResults).toBe(1);
    });

    it("should return empty results for unpublished resume", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      const resumeDoc = createMockDocSnapshot(true, {
        title: "Software Engineer Resume",
        userId: "user-456",
        published: false, // Not published
        createdAt: "2024-01-15T10:00:00Z",
      });

      mockGetDocumentIdFromResumeId.mockResolvedValue({
        documentId: "doc-123",
        userId: "user-456",
      });

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, {})),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(resumeDoc),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            userId: "resume-12345",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.notification).toBe("This resume is not published");
    });

    it("should search by direct document ID", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      const resumeDoc = createMockDocSnapshot(true, {
        title: "Frontend Developer Resume",
        userId: "user-789",
        published: true,
        createdAt: "2024-01-20T10:00:00Z",
      });
      const userDoc = createMockDocSnapshot(true, {
        displayName: "Jane Smith",
        email: "jane@example.com",
      });

      mockGetDocumentIdFromResumeId.mockResolvedValue(null); // No mapping found

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(userDoc),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(resumeDoc),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            userId: "doc-456",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].resumeId).toBe("mock-doc-id");
    });

    it("should search by user ID", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      const userDoc = createMockDocSnapshot(true, {
        displayName: "Bob Johnson",
        email: "bob@example.com",
      });
      const resumeDoc = createMockDocSnapshot(true, {
        title: "Data Scientist Resume",
        userId: "user-999",
        published: true,
        createdAt: "2024-01-25T10:00:00Z",
      });

      mockGetDocumentIdFromResumeId.mockResolvedValue(null);

      let callCount = 0;
      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(userDoc),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          if (callCount === 0) {
            callCount++;
            return {
              doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(createMockDocSnapshot(false)),
              })),
            } as any;
          } else {
            return {
              where: jest.fn(() => ({
                where: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest
                      .fn()
                      .mockResolvedValue(createMockQuerySnapshot([resumeDoc])),
                  })),
                })),
              })),
            } as any;
          }
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            userId: "user-999",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].userId).toBe("user-999");
    });

    it("should return empty results when no candidate found", async () => {
      mockGetUserTier.mockResolvedValue("basic");

      mockGetDocumentIdFromResumeId.mockResolvedValue(null);

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, {})),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(createMockDocSnapshot(false)),
            })),
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue(createMockQuerySnapshot([])),
                })),
              })),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            userId: "nonexistent",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.notification).toBe(
        "No published resume found for this candidate"
      );
    });
  });

  describe("Premium Tier", () => {
    it("should return 400 when neither skills nor location provided for premium user", async () => {
      mockGetUserTier.mockResolvedValue("premium");

      mockAdminDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, {})),
          set: jest.fn().mockResolvedValue(undefined),
        })),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({ recruiterId: "recruiter-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Please provide either a userId or skills/location for search"
      );
    });

    it("should search by skills successfully", async () => {
      mockGetUserTier.mockResolvedValue("premium");

      const resumeDoc = createMockDocSnapshot(true, {
        title: "Full Stack Developer",
        userId: "user-111",
        published: true,
        createdAt: "2024-02-01T10:00:00Z",
        skills: [
          { name: "React" },
          { name: "Node.js" },
          { name: "TypeScript" },
        ],
      });
      const userDoc = createMockDocSnapshot(true, {
        displayName: "Alice Developer",
        email: "alice@example.com",
        location: "San Francisco",
      });

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(userDoc),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            where: jest.fn(() => ({
              get: jest
                .fn()
                .mockResolvedValue(createMockQuerySnapshot([resumeDoc])),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            skills: ["React", "TypeScript"],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].skills).toEqual([
        "React",
        "Node.js",
        "TypeScript",
      ]);
      expect(data.tier).toBe("premium");
    });

    it("should search by location successfully", async () => {
      mockGetUserTier.mockResolvedValue("premium");

      const resumeDoc = createMockDocSnapshot(true, {
        title: "Backend Engineer",
        userId: "user-222",
        published: true,
        createdAt: "2024-02-05T10:00:00Z",
        skills: [{ name: "Python" }, { name: "Django" }],
        location: "New York",
      });
      const userDoc = createMockDocSnapshot(true, {
        displayName: "Bob Wilson",
        email: "bob@example.com",
        location: "New York",
      });

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(userDoc),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            where: jest.fn(() => ({
              get: jest
                .fn()
                .mockResolvedValue(createMockQuerySnapshot([resumeDoc])),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            location: "New York",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].location).toBe("New York");
    });

    it("should limit results to 50 for premium tier", async () => {
      mockGetUserTier.mockResolvedValue("premium");

      // Create 55 mock resume docs
      const resumeDocs = Array.from({ length: 55 }, (_, i) =>
        createMockDocSnapshot(true, {
          title: `Resume ${i}`,
          userId: `user-${i}`,
          published: true,
          createdAt: "2024-01-15T10:00:00Z",
          skills: [{ name: "JavaScript" }],
        })
      );

      const userDocs = Array.from({ length: 55 }, (_, i) =>
        createMockDocSnapshot(true, {
          displayName: `User ${i}`,
          email: `user${i}@example.com`,
          location: "Test City",
        })
      );

      mockAdminDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === "users") {
          return {
            doc: jest.fn((id: string) => ({
              get: jest
                .fn()
                .mockResolvedValue(userDocs[parseInt(id.split("-")[1]) || 0]),
            })),
          } as any;
        } else if (collectionName === "resumes") {
          return {
            where: jest.fn(() => ({
              get: jest
                .fn()
                .mockResolvedValue(createMockQuerySnapshot(resumeDocs)),
            })),
          } as any;
        } else if (collectionName === "recruiterMetrics") {
          return {
            doc: jest.fn(() => ({
              set: jest.fn().mockResolvedValue(undefined),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/search-resumes",
        {
          method: "POST",
          body: JSON.stringify({
            recruiterId: "recruiter-123",
            skills: ["JavaScript"],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(50);
      expect(data.count).toBe(50);
    });
  });

  it("should return 403 when basic tier tries premium search", async () => {
    mockGetUserTier.mockResolvedValue("basic");

    mockAdminDb.collection.mockReturnValue({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, {})),
        set: jest.fn().mockResolvedValue(undefined),
      })),
    } as any);
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ 
          recruiterId: "recruiter-123",
          skills: ["React"],
          location: "New York"
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Premium or enterprise subscription required for skills/location search");
  });

  it("should handle database errors", async () => {
    mockAdminDb.collection.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/search-resumes",
      {
        method: "POST",
        body: JSON.stringify({ recruiterId: "recruiter-123" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to process request");
  });
});
