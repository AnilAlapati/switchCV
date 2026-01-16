import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/recruiter/candidates/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
} from "@/lib/recruiterPipeline";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error" },
      { status: status || 500 }
    )
  ),
}));

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
  },
}));

describe("Recruiter Candidates API", () => {
  const mockUserId = "recruiter-123";
  const mockCandidateId = "candidate-456";
  const mockNoteId = "note-789";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock verifyRecruiterRole (user check)
    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "recruiter" }),
            }),
          }),
        };
      }
      return {
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ id: mockCandidateId, name: "John Doe" }),
        }),
        collection: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
    });
  });

  describe("POST /api/recruiter/candidates", () => {
    it("should create a candidate", async () => {
      const mockCandidate = {
        id: mockCandidateId,
        name: "John Doe",
        email: "john@example.com",
        position: "Engineer",
      };
      (createCandidate as jest.Mock).mockReturnValue(mockCandidate);

      const req = new NextRequest("http://localhost/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: "John Doe",
          email: "john@example.com",
          position: "Engineer",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe(mockCandidateId);
    });

    it("should update candidate priority", async () => {
      const mockCandidate = { id: mockCandidateId, priority: "high" };
      (updateCandidatePriority as jest.Mock).mockReturnValue(mockCandidate);

      const req = new NextRequest("http://localhost/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "update-priority",
          candidateId: mockCandidateId,
          priority: "high",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should add a note to a candidate", async () => {
      const mockNote = { id: mockNoteId, content: "Great candidate" };
      (addCandidateNote as jest.Mock).mockReturnValue(mockNote);

      // Mock count().get()
      const mockCountGet = jest.fn().mockResolvedValue({
        data: () => ({ count: 5 }),
      });

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            }),
          };
        }
        return {
          doc: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ id: mockCandidateId }),
          }),
          set: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          collection: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnValue({
            get: mockCountGet,
          }),
        };
      });

      const req = new NextRequest("http://localhost/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "add-note",
          candidateId: mockCandidateId,
          content: "Great candidate",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.totalNotes).toBe(5);
    });

    it("should return 403 if not a recruiter", async () => {
      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "jobseeker" }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest("http://localhost/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({ action: "create" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("should return 400 for invalid action", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({ action: "invalid" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/recruiter/candidates", () => {
    it("should fetch a single candidate with notes", async () => {
      const mockCandidateData = { name: "John Doe" };
      const mockNoteData = {
        content: "Note 1",
        createdAt: { toDate: () => new Date() },
      };

      const mockGet = jest
        .fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => mockCandidateData,
        }) // For candidateDoc
        .mockResolvedValueOnce({
          docs: [{ id: mockNoteId, data: () => mockNoteData }],
        }); // For notesSnap

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            }),
          };
        }
        return {
          doc: jest.fn().mockReturnThis(),
          collection: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: mockGet,
        };
      });

      const req = new NextRequest(
        `http://localhost/api/recruiter/candidates?id=${mockCandidateId}`
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe(mockCandidateId);
      expect(data.notes).toHaveLength(1);
    });

    it("should fetch all candidates", async () => {
      const mockCandidateData = {
        name: "John Doe",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            }),
          };
        }
        return {
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [{ id: mockCandidateId, data: () => mockCandidateData }],
          }),
        };
      });

      const req = new NextRequest("http://localhost/api/recruiter/candidates");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidates).toHaveLength(1);
    });

    it("should return 404 if candidate not found", async () => {
      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: "recruiter" }),
              }),
            }),
          };
        }
        return {
          doc: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ exists: false }),
        };
      });

      const req = new NextRequest(
        `http://localhost/api/recruiter/candidates?id=nonexistent`
      );
      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });
});
