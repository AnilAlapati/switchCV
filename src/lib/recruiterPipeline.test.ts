/**
 * Tests for recruiterPipeline.ts - Candidate Operations
 */

import {
  createCandidate,
  moveCandidateStage,
  updateCandidatePriority,
  addCandidateNote,
} from "@/lib/recruiterPipeline";
import {
  CandidatePriority,
  PipelineStage,
} from "@/lib/recruiterDashboard.types";

describe("recruiterPipeline - Candidate Operations", () => {
  describe("createCandidate", () => {
    it("should create candidate with required fields", () => {
      const candidate = createCandidate(
        "John Doe",
        "john@example.com",
        "Senior Engineer"
      );

      expect(candidate.name).toBe("John Doe");
      expect(candidate.email).toBe("john@example.com");
      expect(candidate.position).toBe("Senior Engineer");
      expect(candidate.stage).toBe(PipelineStage.LEAD);
      expect(candidate.priority).toBe(CandidatePriority.MEDIUM);
      expect(candidate.id).toBeDefined();
      expect(candidate.createdAt).toBeInstanceOf(Date);
    });

    it("should create candidate with optional fields", () => {
      const candidate = createCandidate(
        "Jane Doe",
        "jane@example.com",
        "Product Manager",
        "+1234567890",
        "https://example.com/resume.pdf",
        "LinkedIn"
      );

      expect(candidate.phone).toBe("+1234567890");
      expect(candidate.resumeUrl).toBe("https://example.com/resume.pdf");
      expect(candidate.source).toBe("LinkedIn");
    });

    it("should generate unique candidate IDs", () => {
      const candidate1 = createCandidate(
        "John",
        "john@example.com",
        "Engineer"
      );
      const candidate2 = createCandidate("Jane", "jane@example.com", "Manager");

      expect(candidate1.id).not.toBe(candidate2.id);
      expect(candidate1.id).toMatch(/^cand_/);
    });
  });

  describe("moveCandidateStage", () => {
    it("should move candidate to new stage", () => {
      const candidate = createCandidate("John", "john@example.com", "Engineer");
      const updated = moveCandidateStage(candidate, PipelineStage.SCREENED);

      expect(updated.stage).toBe(PipelineStage.SCREENED);
      expect(updated.id).toBe(candidate.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        candidate.createdAt.getTime()
      );
    });

    it("should update timestamp when moving stage", () => {
      const candidate = createCandidate("John", "john@example.com", "Engineer");
      const originalTime = candidate.updatedAt.getTime();
      const updated = moveCandidateStage(candidate, PipelineStage.INTERVIEWED);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime);
    });

    it("should handle all pipeline stages", () => {
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      const stages = [
        PipelineStage.LEAD,
        PipelineStage.SCREENED,
        PipelineStage.INTERVIEWED,
        PipelineStage.OFFERED,
        PipelineStage.HIRED,
        PipelineStage.REJECTED,
      ];

      stages.forEach((stage) => {
        const updated = moveCandidateStage(candidate, stage);
        expect(updated.stage).toBe(stage);
      });
    });
  });

  describe("updateCandidatePriority", () => {
    it("should update candidate priority", () => {
      const candidate = createCandidate("John", "john@example.com", "Engineer");
      const updated = updateCandidatePriority(
        candidate,
        CandidatePriority.HIGH
      );

      expect(updated.priority).toBe(CandidatePriority.HIGH);
      expect(updated.id).toBe(candidate.id);
    });

    it("should handle all priority levels", () => {
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      const priorities = [
        CandidatePriority.LOW,
        CandidatePriority.MEDIUM,
        CandidatePriority.HIGH,
        CandidatePriority.CRITICAL,
      ];

      priorities.forEach((priority) => {
        const updated = updateCandidatePriority(candidate, priority);
        expect(updated.priority).toBe(priority);
      });
    });
  });

  describe("addCandidateNote", () => {
    it("should create note with all fields", () => {
      const note = addCandidateNote(
        "cand_123",
        "user_456",
        "Great interview performance",
        "assessment",
        false
      );

      expect(note.candidateId).toBe("cand_123");
      expect(note.userId).toBe("user_456");
      expect(note.content).toBe("Great interview performance");
      expect(note.category).toBe("assessment");
      expect(note.isPrivate).toBe(false);
      expect(note.id).toBeDefined();
      expect(note.createdAt).toBeInstanceOf(Date);
    });

    it("should create note with default privacy", () => {
      const note = addCandidateNote(
        "cand_123",
        "user_456",
        "Interview scheduled"
      );

      expect(note.isPrivate).toBe(false);
    });

    it("should generate unique note IDs", () => {
      const note1 = addCandidateNote("cand_1", "user_1", "Note 1");
      const note2 = addCandidateNote("cand_2", "user_2", "Note 2");

      expect(note1.id).not.toBe(note2.id);
      expect(note1.id).toMatch(/^note_/);
    });
  });
});
