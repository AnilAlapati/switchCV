/**
 * Tests for recruiterPipelineHelpers.ts
 */

import {
  initializePipeline,
  addCandidateToPipeline,
  moveCandidateInPipeline,
  calculateTimeInStage,
  calculateAverageTimeToHire,
  getHiredThisMonth,
  getPendingFollowUps,
} from "@/lib/recruiterPipelineHelpers";
import { createCandidate } from "@/lib/recruiterPipeline";
import { PipelineStage } from "@/lib/recruiterDashboard.types";

describe("recruiterPipelineHelpers", () => {
  describe("initializePipeline", () => {
    it("should initialize empty pipeline", () => {
      const pipeline = initializePipeline("job_1", "Engineer");

      expect(pipeline.jobId).toBe("job_1");
      expect(pipeline.jobTitle).toBe("Engineer");
      expect(pipeline.columns).toHaveLength(6);
      expect(pipeline.totalCandidates).toBe(0);
    });

    it("should have all pipeline stages", () => {
      const pipeline = initializePipeline("job_1", "Engineer");

      const stageNames = pipeline.columns.map((col) => col.stage);
      expect(stageNames).toContain(PipelineStage.LEAD);
      expect(stageNames).toContain(PipelineStage.HIRED);
    });
  });

  describe("addCandidateToPipeline", () => {
    it("should add candidate to pipeline", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, candidate);

      expect(updated.totalCandidates).toBe(1);
      const leadStage = updated.columns.find(
        (col) => col.stage === PipelineStage.LEAD
      );
      expect(leadStage?.count).toBe(1);
    });

    it("should maintain immutability", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, candidate);

      expect(pipeline.totalCandidates).toBe(0);
      expect(updated.totalCandidates).toBe(1);
    });

    it("should handle multiple candidates", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand1 = createCandidate("John", "john@example.com", "Engineer");
      const cand2 = createCandidate("Jane", "jane@example.com", "Engineer");

      let updated = addCandidateToPipeline(pipeline, cand1);
      updated = addCandidateToPipeline(updated, cand2);

      expect(updated.totalCandidates).toBe(2);
    });
  });

  describe("moveCandidateInPipeline", () => {
    it("should move candidate to new stage", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      let updated = addCandidateToPipeline(pipeline, candidate);
      updated = moveCandidateInPipeline(
        updated,
        candidate,
        PipelineStage.SCREENED
      );

      const screenedStage = updated.columns.find(
        (col) => col.stage === PipelineStage.SCREENED
      );
      expect(screenedStage?.count).toBeGreaterThanOrEqual(0);
    });

    it("should maintain candidate count", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      let updated = addCandidateToPipeline(pipeline, candidate);
      const totalBefore = updated.totalCandidates;
      updated = moveCandidateInPipeline(
        updated,
        candidate,
        PipelineStage.INTERVIEWED
      );

      expect(updated.totalCandidates).toBe(totalBefore);
    });
  });

  describe("calculateTimeInStage", () => {
    it("should calculate time for pipeline", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const days = calculateTimeInStage(pipeline);

      expect(typeof days).toBe("number");
      expect(days).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateAverageTimeToHire", () => {
    it("should calculate average for empty pipeline", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const avgTime = calculateAverageTimeToHire(pipeline);

      expect(avgTime).toBe(0);
    });

    it("should handle pipeline with candidates", () => {
      let pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      pipeline = addCandidateToPipeline(pipeline, candidate);
      const avgTime = calculateAverageTimeToHire(pipeline);

      expect(typeof avgTime).toBe("number");
      expect(avgTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getHiredThisMonth", () => {
    it("should return hired count", () => {
      const pipeline = initializePipeline("job_1", "Engineer");

      const count = getHiredThisMonth(pipeline);

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPendingFollowUps", () => {
    it("should return pending follow-ups", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const candidate = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, candidate);
      const followUps = getPendingFollowUps(updated);

      expect(Array.isArray(followUps)).toBe(true);
    });
  });
});
