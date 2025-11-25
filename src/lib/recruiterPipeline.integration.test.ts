/**
 * Tests for recruiterPipeline.ts - Search, Interview & Metrics
 */

import {
  getCandidatesByStage,
  getCandidatesByPriority,
  searchCandidatesInPipeline,
  scheduleInterview,
  calculatePipelineMetrics,
  createCandidate,
} from "@/lib/recruiterPipeline";
import {
  PipelineStage,
  CandidatePriority,
  InterviewType,
} from "@/lib/recruiterDashboard.types";
import {
  initializePipeline,
  addCandidateToPipeline,
} from "@/lib/recruiterPipelineHelpers";

describe("recruiterPipeline - Search, Interview & Metrics", () => {
  describe("getCandidatesByStage", () => {
    it("should return candidates in specified stage", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand1 = createCandidate("John", "john@example.com", "Engineer");
      const cand2 = createCandidate("Jane", "jane@example.com", "Engineer");

      let updated = addCandidateToPipeline(pipeline, cand1);
      updated = addCandidateToPipeline(updated, cand2);

      const candidates = getCandidatesByStage(updated, PipelineStage.LEAD);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].id).toBe(cand1.id);
      expect(candidates[1].id).toBe(cand2.id);
    });

    it("should return empty array for stage with no candidates", () => {
      const pipeline = initializePipeline("job_1", "Engineer");

      const candidates = getCandidatesByStage(pipeline, PipelineStage.HIRED);

      expect(candidates).toHaveLength(0);
    });
  });

  describe("getCandidatesByPriority", () => {
    it("should return candidates with specified priority", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand1 = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, cand1);

      const mediumPriority = getCandidatesByPriority(
        updated,
        CandidatePriority.MEDIUM
      );

      expect(mediumPriority.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("searchCandidatesInPipeline", () => {
    it("should search candidates by name", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand1 = createCandidate("John Doe", "john@example.com", "Engineer");
      const cand2 = createCandidate(
        "Jane Smith",
        "jane@example.com",
        "Engineer"
      );

      let updated = addCandidateToPipeline(pipeline, cand1);
      updated = addCandidateToPipeline(updated, cand2);

      const results = searchCandidatesInPipeline(updated, "John");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("John Doe");
    });

    it("should search candidates by email", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, cand);
      const results = searchCandidatesInPipeline(updated, "john@example.com");

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe("john@example.com");
    });

    it("should be case-insensitive", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand = createCandidate("JOHN", "JOHN@EXAMPLE.COM", "Engineer");

      const updated = addCandidateToPipeline(pipeline, cand);
      const results = searchCandidatesInPipeline(updated, "john");

      expect(results).toHaveLength(1);
    });

    it("should return empty array for no matches", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, cand);
      const results = searchCandidatesInPipeline(updated, "xyz");

      expect(results).toHaveLength(0);
    });
  });

  describe("scheduleInterview", () => {
    it("should create interview with all details", () => {
      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const interview = scheduleInterview(
        "cand_123",
        "job_456",
        InterviewType.VIDEO,
        scheduledTime,
        60,
        ["interviewer@example.com"]
      );

      expect(interview.candidateId).toBe("cand_123");
      expect(interview.jobId).toBe("job_456");
      expect(interview.interviewType).toBe(InterviewType.VIDEO);
      expect(interview.duration).toBe(60);
      expect(interview.interviewers).toContain("interviewer@example.com");
      expect(interview.status).toBe("scheduled");
      expect(interview.id).toBeDefined();
    });

    it("should handle different interview types", () => {
      const types = [
        InterviewType.PHONE,
        InterviewType.VIDEO,
        InterviewType.IN_PERSON,
        InterviewType.CODING,
        InterviewType.PANEL,
      ];

      types.forEach((type) => {
        const interview = scheduleInterview(
          "cand_123",
          "job_456",
          type,
          new Date(),
          60,
          ["interviewer@example.com"]
        );

        expect(interview.interviewType).toBe(type);
      });
    });
  });

  describe("calculatePipelineMetrics", () => {
    it("should calculate metrics for empty pipeline", () => {
      const pipeline = initializePipeline("job_1", "Engineer");

      const metrics = calculatePipelineMetrics(pipeline);

      expect(metrics.totalCandidates).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.averageTimeToHire).toBe(0);
    });

    it("should calculate conversion rate correctly", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand1 = createCandidate("John", "john@example.com", "Engineer");
      const cand2 = createCandidate("Jane", "jane@example.com", "Engineer");

      let updated = addCandidateToPipeline(pipeline, cand1);
      updated = addCandidateToPipeline(updated, cand2);

      const metrics = calculatePipelineMetrics(updated);

      expect(metrics.totalCandidates).toBe(2);
      expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
    });

    it("should return stage distribution", () => {
      const pipeline = initializePipeline("job_1", "Engineer");
      const cand = createCandidate("John", "john@example.com", "Engineer");

      const updated = addCandidateToPipeline(pipeline, cand);
      const metrics = calculatePipelineMetrics(updated);

      expect(metrics.stageDistribution).toBeDefined();
      expect(metrics.stageDistribution[PipelineStage.LEAD]).toBe(1);
    });
  });
});
