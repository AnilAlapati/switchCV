/**
 * @jest-environment node
 */
/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import { CandidatePriority, PipelineStage } from "@/lib/recruiterDashboard.types";

// Mock the recruiterPipeline functions
jest.mock("@/lib/recruiterPipeline", () => ({
  createCandidate: jest.fn(),
  updateCandidatePriority: jest.fn(),
  addCandidateNote: jest.fn(),
}));

import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
} from "@/lib/recruiterPipeline";

// Import the exported Maps for test isolation
import { candidates, notes } from "./route";

describe("POST /api/recruiter/candidates", () => {
  beforeEach(() => {
    // Clear storage between tests
    candidates.clear();
    notes.clear();
    jest.clearAllMocks();
  });

  describe("create action", () => {
    it("should create a candidate successfully", async () => {
      const createdAt = new Date();
      const updatedAt = new Date();
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

      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
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
      });

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
      expect(candidates.get("cand-123")).toEqual(mockCandidate);
    });

    it("should handle create with missing required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: "John Doe",
          // missing email and position
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: name, email, position");
      expect(createCandidate).not.toHaveBeenCalled();
    });

    it("should handle create with empty candidateIds array", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: "",
          email: "",
          position: "",
        }),
      });

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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCandidate = {
        ...existingCandidate,
        priority: CandidatePriority.HIGH,
        updatedAt: new Date(),
      };

      candidates.set("cand-123", existingCandidate);
      (updateCandidatePriority as jest.Mock).mockReturnValue(updatedCandidate);

      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "update-priority",
          candidateId: "cand-123",
          priority: CandidatePriority.HIGH,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe("cand-123");
      expect(data.candidate.name).toBe("John Doe");
      expect(data.candidate.email).toBe("john@example.com");
      expect(data.candidate.position).toBe("Software Engineer");
      expect(data.candidate.stage).toBe(PipelineStage.LEAD);
      expect(data.candidate.priority).toBe(CandidatePriority.HIGH);
      expect(data.message).toBe("Candidate priority updated");
      expect(updateCandidatePriority).toHaveBeenCalledWith(existingCandidate, CandidatePriority.HIGH);
      expect(candidates.get("cand-123")).toEqual(updatedCandidate);
    });

    it("should return 404 for non-existent candidate", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "update-priority",
          candidateId: "non-existent",
          priority: CandidatePriority.LOW,
        }),
      });

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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockNote = {
        id: "note-123",
        candidateId: "cand-123",
        userId: "user-456",
        content: "Great technical skills",
        category: "technical",
        isPrivate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      candidates.set("cand-123", existingCandidate);
      (addCandidateNote as jest.Mock).mockReturnValue(mockNote);

      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "add-note",
          candidateId: "cand-123",
          userId: "user-456",
          content: "Great technical skills",
          category: "technical",
          isPrivate: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.note.id).toBe("note-123");
      expect(data.note.candidateId).toBe("cand-123");
      expect(data.note.userId).toBe("user-456");
      expect(data.note.content).toBe("Great technical skills");
      expect(data.note.category).toBe("technical");
      expect(data.note.isPrivate).toBe(false);
      expect(data.totalNotes).toBe(1);
      expect(data.message).toBe("Note added successfully");
      expect(addCandidateNote).toHaveBeenCalledWith(
        "cand-123",
        "user-456",
        "Great technical skills",
        "technical",
        false
      );
      expect(notes.get("cand-123")).toEqual([mockNote]);
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

      candidates.set("cand-123", existingCandidate);

      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "add-note",
          candidateId: "cand-123",
          // missing userId and content
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: candidateId, userId, content");
      expect(addCandidateNote).not.toHaveBeenCalled();
    });

    it("should return 404 for non-existent candidate when adding note", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "add-note",
          candidateId: "non-existent",
          userId: "user-456",
          content: "Test note",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Candidate not found");
      expect(addCandidateNote).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return 400 for invalid action", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: JSON.stringify({
          action: "invalid-action",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });

    it("should return 500 for malformed JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/recruiter/candidates", {
        method: "POST",
        body: "invalid json",
      });

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
    candidates.clear();
    notes.clear();
  });

  it("should return a specific candidate by id", async () => {
    const mockCandidate = {
      id: "cand-123",
      name: "John Doe",
      email: "john@example.com",
      position: "Software Engineer",
      stage: PipelineStage.LEAD,
      priority: CandidatePriority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNotes = [
      {
        id: "note-1",
        candidateId: "cand-123",
        userId: "user-1",
        content: "Technical interview notes",
        category: "technical" as const,
        isPrivate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    candidates.set("cand-123", mockCandidate);
    notes.set("cand-123", mockNotes);

    const request = new NextRequest("http://localhost:3000/api/recruiter/candidates?id=cand-123");

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
    const request = new NextRequest("http://localhost:3000/api/recruiter/candidates?id=non-existent");

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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCandidate2 = {
      id: "cand-456",
      name: "Jane Smith",
      email: "jane@example.com",
      position: "Product Manager",
      stage: PipelineStage.SCREENED,
      priority: CandidatePriority.HIGH,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    candidates.set("cand-123", mockCandidate1);
    candidates.set("cand-456", mockCandidate2);

    const request = new NextRequest("http://localhost:3000/api/recruiter/candidates");

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
    const request = new NextRequest("http://localhost:3000/api/recruiter/candidates");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidates).toEqual([]);
    expect(data.count).toBe(0);
  });
});