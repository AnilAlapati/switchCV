/**
 * @jest-environment node
 */
 

import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import {
  CandidatePriority,
  PipelineStage,
} from "@/lib/recruiterDashboard.types";

/**
 * Helper to add auth headers to requests
 */
const withAuth = (init?: RequestInit): RequestInit => ({
  ...init,
  headers: { authorization: "Bearer test-token", ...(init?.headers || {}) },
});

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => {
  const mockFirestoreData = new Map<string, any>();
  const mockSubcollections = new Map<string, Map<string, any>>();

  const createMockTimestamp = (date = new Date()) => ({
    toDate: () => date,
    toMillis: () => date.getTime(),
  });

  const getSubcollection = (parentId: string, subcollectionName: string) => {
    const key = `${parentId}/${subcollectionName}`;
    if (!mockSubcollections.has(key)) {
      mockSubcollections.set(key, new Map());
    }
    return mockSubcollections.get(key)!;
  };

  const mockDocRef = (
    id: string,
    parentCollection?: string,
    parentId?: string
  ) => ({
    get: jest.fn().mockImplementation(async () => ({
      exists: parentId
        ? getSubcollection(parentId, parentCollection!).has(id)
        : mockFirestoreData.has(id),
      data: () =>
        parentId
          ? getSubcollection(parentId, parentCollection!).get(id)
          : mockFirestoreData.get(id),
      id,
    })),
    set: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const dataWithTimestamp = {
        ...data,
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      };
      if (parentId) {
        getSubcollection(parentId, parentCollection!).set(
          id,
          dataWithTimestamp
        );
      } else {
        mockFirestoreData.set(id, dataWithTimestamp);
      }
    }),
    update: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const store = parentId
        ? getSubcollection(parentId, parentCollection!)
        : mockFirestoreData;
      const existing = store.get(id) || {};
      store.set(id, {
        ...existing,
        ...data,
        updatedAt: createMockTimestamp(),
      });
    }),
    collection: jest.fn().mockImplementation((subcollName: string) => ({
      doc: (docId: string) => mockDocRef(docId, subcollName, id),
      get: jest.fn().mockResolvedValue({
        docs: Array.from(getSubcollection(id, subcollName).entries()).map(
          ([docId, data]) => ({
            id: docId,
            data: () => data,
            exists: true,
          })
        ),
      }),
      orderBy: jest.fn().mockReturnThis(),
      count: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue({
          data: () => ({
            count: getSubcollection(id, subcollName).size,
          }),
        }),
      })),
    })),
  });

  return {
    adminDb: {
      collection: jest.fn().mockImplementation((collectionName: string) => {
        // Handle users collection for role verification
        if (collectionName === "users") {
          return {
            doc: jest.fn().mockImplementation((userId: string) => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            })),
          };
        }

        return {
          doc: jest.fn().mockImplementation((id: string) => mockDocRef(id)),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: Array.from(mockFirestoreData.entries()).map(([id, data]) => ({
              id,
              data: () => data,
              exists: true,
            })),
          }),
        };
      }),
    },
    _mockData: mockFirestoreData,
    _mockSubcollections: mockSubcollections,
  };
});

const {
  _mockData: mockFirestoreData,
  _mockSubcollections: mockSubcollections,
} = require("@/lib/firebase-admin");

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id" }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const details =
      error instanceof Error
        ? error.message
        : error
          ? String(error)
          : undefined;
    return {
      status,
      json: async () => ({ error: message, ...(details ? { details } : {}) }),
    };
  }),
}));

// Mock the recruiterPipeline functions
jest.mock("@/lib/recruiterPipeline", () => ({
  createCandidate: jest.fn(),
  updateCandidatePriority: jest.fn(),
  addCandidateNote: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
} from "@/lib/recruiterPipeline";

describe("POST /api/recruiter/candidates", () => {
  beforeEach(() => {
    // Clear storage between tests
    mockFirestoreData.clear();
    mockSubcollections.clear();
    jest.clearAllMocks();
  });

  describe("create action", () => {
    it("should create a candidate successfully", async () => {
      const createdAt = { toDate: () => new Date() };
      const updatedAt = { toDate: () => new Date() };
      const mockCandidate = {
        id: "cand-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Software Engineer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt,
        updatedAt,
      };

      (createCandidate as jest.Mock).mockReturnValue(mockCandidate);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "create",
            name: "John Doe",
            email: "john@example.com",
            position: "Software Engineer",
            phone: "+1234567890",
            resumeUrl: "https://example.com/resume.pdf",
            source: "LinkedIn",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe("cand-123");
      expect(data.candidate.name).toBe("John Doe");
      expect(data.candidate.email).toBe("john@example.com");
      expect(data.candidate.position).toBe("Software Engineer");
      expect(data.candidate.stage).toBe("lead");
      expect(data.candidate.priority).toBe("medium");
      expect(data.message).toBe("Candidate created successfully");
      expect(createCandidate).toHaveBeenCalledWith(
        "John Doe",
        "john@example.com",
        "Software Engineer",
        "+1234567890",
        "https://example.com/resume.pdf",
        "LinkedIn"
      );

      // Verify Firestore data
      const storedData = mockFirestoreData.get("cand-123");
      expect(storedData).toBeDefined();
      expect(storedData.name).toBe("John Doe");
      expect(storedData.createdAt.toDate).toBeDefined();
    });

    it("should handle create with missing required fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "create",
            name: "John Doe",
            // missing email and position
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: name, email, position");
      expect(createCandidate).not.toHaveBeenCalled();
    });

    it("should handle create with empty candidateIds array", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "create",
            name: "",
            email: "",
            position: "",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: name, email, position");
      expect(createCandidate).not.toHaveBeenCalled();
    });
  });

  describe("update-priority action", () => {
    it("should update candidate priority successfully", async () => {
      const existingCandidate = {
        id: "cand-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Software Engineer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      const updatedCandidate = {
        ...existingCandidate,
        priority: CandidatePriority.HIGH,
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreData.set("cand-123", existingCandidate);
      (updateCandidatePriority as jest.Mock).mockReturnValue(updatedCandidate);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "update-priority",
            candidateId: "cand-123",
            priority: CandidatePriority.HIGH,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe("cand-123");
      expect(data.candidate.priority).toBe(CandidatePriority.HIGH);
      expect(data.message).toBe("Candidate priority updated");
      expect(updateCandidatePriority).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cand-123" }),
        CandidatePriority.HIGH
      );

      const storedData = mockFirestoreData.get("cand-123");
      expect(storedData.priority).toBe(CandidatePriority.HIGH);
    });

    it("should return 404 for non-existent candidate", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "update-priority",
            candidateId: "non-existent",
            priority: CandidatePriority.LOW,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Candidate not found");
      expect(updateCandidatePriority).not.toHaveBeenCalled();
    });
  });

  describe("add-note action", () => {
    it("should add note to candidate successfully", async () => {
      const existingCandidate = {
        id: "cand-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Software Engineer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      const mockNote = {
        id: "note-123",
        candidateId: "cand-123",
        userId: "test-user-id",
        content: "Great technical skills",
        category: "technical",
        isPrivate: false,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreData.set("cand-123", existingCandidate);
      (addCandidateNote as jest.Mock).mockReturnValue(mockNote);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-note",
            candidateId: "cand-123",
            userId: "user-456",
            content: "Great technical skills",
            category: "technical",
            isPrivate: false,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.note.id).toBe("note-123");
      expect(data.note.candidateId).toBe("cand-123");
      expect(data.note.userId).toBe("test-user-id");
      expect(data.note.content).toBe("Great technical skills");
      expect(data.note.category).toBe("technical");
      expect(data.note.isPrivate).toBe(false);
      expect(data.totalNotes).toBe(1);
      expect(data.message).toBe("Note added successfully");
      expect(addCandidateNote).toHaveBeenCalledWith(
        "cand-123",
        "test-user-id",
        "Great technical skills",
        "technical",
        false
      );
      // Check subcollection
      const notesMap = mockSubcollections.get("cand-123/notes");
      expect(notesMap).toBeDefined();
      // Note: mockDocRef.set adds createdAt/updatedAt with toDate(), so this should match
      const storedNote = notesMap!.get("note-123");
      expect(storedNote).toBeDefined();
      expect(storedNote.content).toBe("Great technical skills");
    });

    it("should handle add-note with missing required fields", async () => {
      const existingCandidate = {
        id: "cand-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Software Engineer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFirestoreData.set("cand-123", existingCandidate);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-note",
            candidateId: "cand-123",
            // missing userId and content
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: candidateId, content");
      expect(addCandidateNote).not.toHaveBeenCalled();
    });

    it("should return 404 for non-existent candidate when adding note", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-note",
            candidateId: "non-existent",
            userId: "user-456",
            content: "Test note",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Candidate not found");
      expect(addCandidateNote).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return 400 for invalid action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "invalid-action",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });

    it("should return 500 for malformed JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/candidates",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});

describe("GET /api/recruiter/candidates", () => {
  beforeEach(() => {
    // Clear storage between tests
    mockFirestoreData.clear();
    mockSubcollections.clear();
  });

  it("should return a specific candidate by id", async () => {
    const mockCandidate = {
      id: "cand-123",
      name: "John Doe",
      email: "john@example.com",
      position: "Software Engineer",
      stage: PipelineStage.LEAD,
      priority: CandidatePriority.MEDIUM,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    const mockNotes = [
      {
        id: "note-1",
        candidateId: "cand-123",
        userId: "user-1",
        content: "Technical interview notes",
        category: "technical" as const,
        isPrivate: false,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      },
    ];

    mockFirestoreData.set("cand-123", mockCandidate);

    // Setup notes subcollection
    const notesMap = new Map();
    notesMap.set("note-1", mockNotes[0]);
    mockSubcollections.set("cand-123/notes", notesMap);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/candidates?id=cand-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidate.id).toBe("cand-123");
    expect(data.candidate.name).toBe("John Doe");
    expect(data.candidate.email).toBe("john@example.com");
    expect(data.candidate.position).toBe("Software Engineer");
    expect(data.candidate.stage).toBe(PipelineStage.LEAD);
    expect(data.candidate.priority).toBe(CandidatePriority.MEDIUM);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].id).toBe("note-1");
    expect(data.notes[0].candidateId).toBe("cand-123");
    expect(data.notes[0].userId).toBe("user-1");
    expect(data.notes[0].content).toBe("Technical interview notes");
    expect(data.notes[0].category).toBe("technical");
    expect(data.notes[0].isPrivate).toBe(false);
  });

  it("should return 404 for non-existent candidate", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/candidates?id=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Candidate not found");
  });

  it("should return all candidates", async () => {
    const mockCandidate1 = {
      id: "cand-123",
      name: "John Doe",
      email: "john@example.com",
      position: "Software Engineer",
      stage: PipelineStage.LEAD,
      priority: CandidatePriority.MEDIUM,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    const mockCandidate2 = {
      id: "cand-456",
      name: "Jane Smith",
      email: "jane@example.com",
      position: "Product Manager",
      stage: PipelineStage.SCREENED,
      priority: CandidatePriority.HIGH,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    mockFirestoreData.set("cand-123", mockCandidate1);
    mockFirestoreData.set("cand-456", mockCandidate2);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/candidates"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidates).toHaveLength(2);
    expect(data.candidates[0].id).toBe("cand-123");
    expect(data.candidates[0].name).toBe("John Doe");
    expect(data.candidates[0].stage).toBe(PipelineStage.LEAD);
    expect(data.candidates[0].priority).toBe(CandidatePriority.MEDIUM);
    expect(data.candidates[1].id).toBe("cand-456");
    expect(data.candidates[1].name).toBe("Jane Smith");
    expect(data.candidates[1].stage).toBe(PipelineStage.SCREENED);
    expect(data.candidates[1].priority).toBe(CandidatePriority.HIGH);
    expect(data.count).toBe(2);
  });

  it("should return empty array when no candidates exist", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/candidates"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidates).toEqual([]);
    expect(data.count).toBe(0);
  });
});
