import {
    initializePipeline,
    addCandidateToPipeline,
    moveCandidateInPipeline,
    calculateTimeInStage,
    calculateAverageTimeToHire,
    getHiredThisMonth,
    compareCandidates,
    createBulkAction,
} from "@/lib/recruiterPipelineHelpers";
import {
    PipelineStage,
    Candidate,
    CandidatePriority,
} from "@/lib/recruiterDashboard.types";

describe("recruiterPipelineHelpers", () => {
    const jobId = "job-1";
    const jobTitle = "Engineer";

    const createMockCandidate = (id: string, stage: PipelineStage): Candidate => ({
        id,
        name: `User ${id}`,
        email: `${id}@example.com`,
        position: "Engineer",
        stage,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),  // 2 days ago
        skillMatch: 80,
    });

    describe("initializePipeline", () => {
        it("should create a pipeline with default stages", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            expect(pipeline.jobId).toBe(jobId);
            expect(pipeline.columns).toHaveLength(6);
            expect(pipeline.totalCandidates).toBe(0);
        });
    });

    describe("addCandidateToPipeline", () => {
        it("should add a candidate to the correct column", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            const candidate = createMockCandidate("c1", PipelineStage.LEAD);
            const updated = addCandidateToPipeline(pipeline, candidate);
            expect(updated.totalCandidates).toBe(1);
            expect(updated.columns[0].count).toBe(1);
        });

        it("should throw error for invalid stage", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            const candidate = createMockCandidate("c1", "INVALID" as any);
            expect(() => addCandidateToPipeline(pipeline, candidate)).toThrow("Invalid pipeline stage");
        });
    });

    describe("moveCandidateInPipeline", () => {
        it("should move candidate between stages", () => {
            let pipeline = initializePipeline(jobId, jobTitle);
            const candidate = createMockCandidate("c1", PipelineStage.LEAD);
            pipeline = addCandidateToPipeline(pipeline, candidate);

            const moved = moveCandidateInPipeline(pipeline, candidate, PipelineStage.SCREENED);
            expect(moved.columns[0].count).toBe(0);
            expect(moved.columns[1].count).toBe(1);
            expect(moved.columns[1].candidates[0].stage).toBe(PipelineStage.SCREENED);
        });
    });

    describe("calculateTimeInStage", () => {
        it("should calculate average days in stage", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            const c1 = createMockCandidate("c1", PipelineStage.LEAD);
            const updated = addCandidateToPipeline(pipeline, c1);

            const times = calculateTimeInStage(updated);
            expect(times[PipelineStage.LEAD]).toBe(2); // 2 days ago from mock
        });

        it("should return 0 for empty stages", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            const times = calculateTimeInStage(pipeline);
            expect(times[PipelineStage.LEAD]).toBe(0);
        });
    });

    describe("calculateAverageTimeToHire", () => {
        it("should return 0 if no hired candidates", () => {
            const pipeline = initializePipeline(jobId, jobTitle);
            expect(calculateAverageTimeToHire(pipeline)).toBe(0);
        });

        it("should calculate average days to hire", () => {
            let pipeline = initializePipeline(jobId, jobTitle);
            const c1 = createMockCandidate("c1", PipelineStage.HIRED);
            // createdAt 10 days ago, updatedAt 2 days ago -> 8 days to hire
            pipeline = addCandidateToPipeline(pipeline, c1);
            expect(calculateAverageTimeToHire(pipeline)).toBe(8);
        });
    });

    describe("getHiredThisMonth", () => {
        it("should count candidates hired in current month", () => {
            let pipeline = initializePipeline(jobId, jobTitle);
            const c1 = createMockCandidate("c1", PipelineStage.HIRED);
            c1.updatedAt = new Date(); // Hired today
            pipeline = addCandidateToPipeline(pipeline, c1);
            expect(getHiredThisMonth(pipeline)).toBe(1);
        });
    });

    describe("compareCandidates", () => {
        it("should compare multiple candidates", () => {
            const c1 = createMockCandidate("c1", PipelineStage.LEAD);
            c1.skillMatch = 90;
            const c2 = createMockCandidate("c2", PipelineStage.LEAD);
            c2.skillMatch = 70;

            const comparison = compareCandidates([c1, c2]);
            expect(comparison.recommendation).toContain("User c1");
            expect(comparison.skillMatches["c1"]).toBe(90);
        });

        it("should handle empty list", () => {
            const comparison = compareCandidates([]);
            expect(comparison.recommendation).toBe("No candidates to compare");
        });
    });

    describe("createBulkAction", () => {
        it("should map move action type correctly", () => {
            const action = createBulkAction("move", ["c1"]);
            expect(action.actionType).toBe("move-stage");
        });

        it("should map priority action type correctly", () => {
            const action = createBulkAction("priority", ["c1"]);
            expect(action.actionType).toBe("update-priority");
        });

        it("should map note action type correctly", () => {
            const action = createBulkAction("note", ["c1"]);
            expect(action.actionType).toBe("add-note");
        });

        it("should use raw type for others", () => {
            const action = createBulkAction("reject", ["c1"]);
            expect(action.actionType).toBe("reject");
        });
    });
});
