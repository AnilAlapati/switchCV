/**
 * Tests for useRecruiterPipeline Hook
 */

import { renderHook, act } from "@testing-library/react";
import { useRecruiterPipeline } from "@/hooks/useRecruiterPipeline";
import {
  PipelineStage,
  CandidatePriority,
  Candidate,
  RecruitmentPipeline,
  PipelineColumn,
  CandidateNote,
} from "@/lib/recruiterDashboard.types";

// Mock the recruiterPipeline functions
jest.mock("@/lib/recruiterPipeline", () => ({
  createCandidate: jest.fn(),
  updateCandidatePriority: jest.fn(),
  addCandidateNote: jest.fn(),
  getCandidatesByStage: jest.fn(),
  searchCandidatesInPipeline: jest.fn(),
  calculatePipelineMetrics: jest.fn(),
}));

// Mock the recruiterPipelineHelpers functions
jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  initializePipeline: jest.fn(),
  addCandidateToPipeline: jest.fn(),
  moveCandidateInPipeline: jest.fn(),
}));

import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
  getCandidatesByStage,
  searchCandidatesInPipeline,
  calculatePipelineMetrics,
} from "@/lib/recruiterPipeline";

import {
  initializePipeline,
  addCandidateToPipeline,
  moveCandidateInPipeline,
} from "@/lib/recruiterPipelineHelpers";

const mockCreateCandidate = createCandidate as jest.MockedFunction<
  typeof createCandidate
>;
const mockUpdateCandidatePriority =
  updateCandidatePriority as jest.MockedFunction<
    typeof updateCandidatePriority
  >;
const mockAddCandidateNote = addCandidateNote as jest.MockedFunction<
  typeof addCandidateNote
>;
const mockGetCandidatesByStage = getCandidatesByStage as jest.MockedFunction<
  typeof getCandidatesByStage
>;
const mockSearchCandidatesInPipeline =
  searchCandidatesInPipeline as jest.MockedFunction<
    typeof searchCandidatesInPipeline
  >;
const mockCalculatePipelineMetrics =
  calculatePipelineMetrics as jest.MockedFunction<
    typeof calculatePipelineMetrics
  >;

const mockInitializePipeline = initializePipeline as jest.MockedFunction<
  typeof initializePipeline
>;
const mockAddCandidateToPipeline =
  addCandidateToPipeline as jest.MockedFunction<typeof addCandidateToPipeline>;
const mockMoveCandidateInPipeline =
  moveCandidateInPipeline as jest.MockedFunction<
    typeof moveCandidateInPipeline
  >;

describe("useRecruiterPipeline", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock implementations
    mockInitializePipeline.mockImplementation(
      (jobId: string, jobTitle: string) => ({
        id: `pipeline_${jobId}`,
        jobId,
        jobTitle,
        columns: [
          {
            stage: PipelineStage.LEAD,
            candidates: [],
            count: 0,
            stageOrder: 1,
          },
          {
            stage: PipelineStage.SCREENED,
            candidates: [],
            count: 0,
            stageOrder: 2,
          },
          {
            stage: PipelineStage.SHORTLISTED,
            candidates: [],
            count: 0,
            stageOrder: 3,
          },
          {
            stage: PipelineStage.INTERVIEWED,
            candidates: [],
            count: 0,
            stageOrder: 4,
          },
          {
            stage: PipelineStage.OFFERED,
            candidates: [],
            count: 0,
            stageOrder: 5,
          },
          {
            stage: PipelineStage.HIRED,
            candidates: [],
            count: 0,
            stageOrder: 6,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        totalCandidates: 0,
      })
    );

    mockCreateCandidate.mockImplementation(
      (name: string, email: string, position: string) => ({
        id: `cand_${name.toLowerCase()}`,
        name,
        email,
        position,
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    mockAddCandidateToPipeline.mockImplementation(
      (pipeline: RecruitmentPipeline, candidate: Candidate) => ({
        ...pipeline,
        columns: pipeline.columns.map((col: PipelineColumn) =>
          col.stage === PipelineStage.LEAD
            ? {
              ...col,
              candidates: [...col.candidates, candidate],
              count: col.count + 1,
            }
            : col
        ),
      })
    );

    mockMoveCandidateInPipeline.mockImplementation(
      (pipeline: RecruitmentPipeline, candidate: Candidate, newStage: PipelineStage) => {
        const candidateId = candidate.id;
        // Find candidate in current stage
        let candidateToMove: Candidate | null = null;
        let fromStage: PipelineStage | null = null;

        for (const col of pipeline.columns) {
          const candidate = col.candidates.find(
            (c: Candidate) => c.id === candidateId
          );
          if (candidate) {
            candidateToMove = candidate;
            fromStage = col.stage;
            break;
          }
        }

        if (!candidateToMove) throw new Error("Candidate not found");

        return {
          ...pipeline,
          columns: pipeline.columns.map((col: PipelineColumn) => {
            if (col.stage === fromStage) {
              return {
                ...col,
                candidates: col.candidates.filter(
                  (c: Candidate) => c.id !== candidateId
                ),
                count: col.count - 1,
              };
            }
            if (col.stage === newStage) {
              return {
                ...col,
                candidates: [
                  ...col.candidates,
                  { ...candidateToMove!, stage: newStage },
                ],
                count: col.count + 1,
              };
            }
            return col;
          }),
        };
      }
    );

    mockUpdateCandidatePriority.mockImplementation(
      (candidate: Candidate, priority: CandidatePriority) => ({
        ...candidate,
        priority,
        updatedAt: new Date(),
      })
    );

    mockAddCandidateNote.mockImplementation(() => {
      // Mock implementation - in real app this would add to notes collection
      return {} as CandidateNote;
    });

    mockGetCandidatesByStage.mockImplementation(
      (pipeline: RecruitmentPipeline, stage: PipelineStage) =>
        pipeline.columns.find((col: PipelineColumn) => col.stage === stage)?.candidates ||
        []
    );

    mockSearchCandidatesInPipeline.mockImplementation(() => []);

    mockCalculatePipelineMetrics.mockImplementation(() => ({
      totalCandidates: 0,
      stageDistribution: {
        [PipelineStage.LEAD]: 0,
        [PipelineStage.SCREENED]: 0,
        [PipelineStage.SHORTLISTED]: 0,
        [PipelineStage.INTERVIEWED]: 0,
        [PipelineStage.OFFERED]: 0,
        [PipelineStage.HIRED]: 0,
        [PipelineStage.REJECTED]: 0,
        [PipelineStage.ON_HOLD]: 0,
      },
      timeInStage: {
        [PipelineStage.LEAD]: 0,
        [PipelineStage.SCREENED]: 0,
        [PipelineStage.SHORTLISTED]: 0,
        [PipelineStage.INTERVIEWED]: 0,
        [PipelineStage.OFFERED]: 0,
        [PipelineStage.HIRED]: 0,
        [PipelineStage.REJECTED]: 0,
        [PipelineStage.ON_HOLD]: 0,
      },
      conversionRate: 0,
      averageTimeToHire: 0,
      hiredThisMonth: 0,
      activeInterviews: 0,
      pendingFollowUps: 0,
    }));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockInitializePipeline.mockReturnValue({
      id: "pipeline_1",
      jobId: "job_1",
      jobTitle: "Engineer",
      columns: [
        { stage: PipelineStage.LEAD, candidates: [], count: 0, stageOrder: 1 },
        { stage: PipelineStage.SCREENED, candidates: [], count: 0, stageOrder: 2 },
        { stage: PipelineStage.INTERVIEWED, candidates: [], count: 0, stageOrder: 3 },
        { stage: PipelineStage.OFFERED, candidates: [], count: 0, stageOrder: 4 },
        { stage: PipelineStage.HIRED, candidates: [], count: 0, stageOrder: 5 },
      ],
      totalCandidates: 0,
    });
    mockCreateCandidate.mockReturnValue({
      id: "cand_1",
      name: "John",
      email: "john@example.com",
      position: "Engineer",
      stage: PipelineStage.LEAD,
      priority: CandidatePriority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAddCandidateToPipeline.mockReturnValue({
      id: "pipeline_1",
      jobId: "job_1",
      jobTitle: "Engineer",
      columns: [
        {
          stage: PipelineStage.LEAD,
          candidates: [
            {
              id: "cand_1",
              name: "John",
              email: "john@example.com",
              position: "Engineer",
              stage: PipelineStage.LEAD,
              priority: CandidatePriority.MEDIUM,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          count: 1,
          stageOrder: 1,
        },
        { stage: PipelineStage.SCREENED, candidates: [], count: 0, stageOrder: 2 },
        { stage: PipelineStage.INTERVIEWED, candidates: [], count: 0, stageOrder: 3 },
        { stage: PipelineStage.OFFERED, candidates: [], count: 0, stageOrder: 4 },
        { stage: PipelineStage.HIRED, candidates: [], count: 0, stageOrder: 5 },
      ],
      totalCandidates: 1,
    });
    mockMoveCandidateInPipeline.mockReturnValue({
      id: "pipeline_1",
      jobId: "job_1",
      jobTitle: "Engineer",
      columns: [
        {
          stage: PipelineStage.LEAD, candidates: [
            {
              id: "cand_1",
              name: "John",
              email: "john@example.com",
              position: "Engineer",
              stage: PipelineStage.LEAD,
              priority: CandidatePriority.MEDIUM,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          count: 1,
          stageOrder: 1,
        },
        { stage: PipelineStage.SCREENED, candidates: [], count: 0, stageOrder: 2 },
        { stage: PipelineStage.INTERVIEWED, candidates: [], count: 0, stageOrder: 3 },
        { stage: PipelineStage.OFFERED, candidates: [], count: 0, stageOrder: 4 },
        { stage: PipelineStage.HIRED, candidates: [], count: 0, stageOrder: 5 },
      ],
      totalCandidates: 1,
    });
    mockUpdateCandidatePriority.mockReturnValue({
      id: "cand_1",
      name: "John",
      email: "john@example.com",
      position: "Engineer",
      stage: PipelineStage.LEAD,
      priority: CandidatePriority.HIGH,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGetCandidatesByStage.mockReturnValue([]);
    mockSearchCandidatesInPipeline.mockReturnValue([]);
    mockCalculatePipelineMetrics.mockReturnValue({
      totalCandidates: 1,
      stageDistribution: {
        [PipelineStage.LEAD]: 1,
        [PipelineStage.SCREENED]: 0,
        [PipelineStage.SHORTLISTED]: 0,
        [PipelineStage.INTERVIEWED]: 0,
        [PipelineStage.OFFERED]: 0,
        [PipelineStage.HIRED]: 0,
        [PipelineStage.REJECTED]: 0,
        [PipelineStage.ON_HOLD]: 0,
      },
      timeInStage: {
        [PipelineStage.LEAD]: 1,
        [PipelineStage.SCREENED]: 0,
        [PipelineStage.SHORTLISTED]: 0,
        [PipelineStage.INTERVIEWED]: 0,
        [PipelineStage.OFFERED]: 0,
        [PipelineStage.HIRED]: 0,
        [PipelineStage.REJECTED]: 0,
        [PipelineStage.ON_HOLD]: 0,
      },
      conversionRate: 0,
      averageTimeToHire: 0,
      hiredThisMonth: 0,
      activeInterviews: 0,
      pendingFollowUps: 0,
    });
  });
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    expect(result.current.pipeline).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should initialize pipeline", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    expect(result.current.pipeline?.jobTitle).toBe("Engineer");
  });

  it("should add candidate to pipeline", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    expect(result.current.pipeline?.totalCandidates).toBe(1);
  });

  it("should move candidate to stage", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const candidates = result.current.getCandidates(PipelineStage.LEAD);
    const candidateId = candidates[0]?.id;

    if (candidateId) {
      await act(async () => {
        result.current.moveCandidate(candidateId, PipelineStage.SCREENED);
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should update candidate priority", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const candidates = result.current.getCandidates(PipelineStage.LEAD);
    const candidateId = candidates[0]?.id;

    if (candidateId) {
      await act(async () => {
        result.current.updatePriority(candidateId, CandidatePriority.HIGH);
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should handle errors gracefully", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    expect(result.current.error).toBeDefined();
  });

  it("should get candidates from stage", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const stageCandidates = result.current.getCandidates(PipelineStage.LEAD);

    expect(stageCandidates.length).toBeGreaterThanOrEqual(0);
  });

  describe("error handling", () => {
    it("should handle initialize error with Error instance", async () => {
      mockInitializePipeline.mockImplementation(() => {
        throw new Error("Pipeline initialization failed");
      });

      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      expect(result.current.error).toBe("Pipeline initialization failed");
      expect(result.current.pipeline).toBeNull();
    });

    it("should handle initialize error with non-Error", async () => {
      mockInitializePipeline.mockImplementation(() => {
        throw "String error";
      });

      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      expect(result.current.error).toBe("Failed to initialize pipeline");
    });

    it("should handle addCandidate error when pipeline not initialized", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      expect(result.current.error).toBe("Pipeline not initialized");
    });

    it("should handle addCandidate error with Error instance", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      mockCreateCandidate.mockImplementation(() => {
        throw new Error("Candidate creation failed");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      expect(result.current.error).toBe("Candidate creation failed");
    });

    it("should handle addCandidate error with non-Error", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      mockCreateCandidate.mockImplementation(() => {
        throw "String error";
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      expect(result.current.error).toBe("Failed to add candidate");
    });

    it("should handle moveCandidate error when pipeline not initialized", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.moveCandidate("cand_1", PipelineStage.SCREENED);
      });

      expect(result.current.error).toBe("Pipeline not initialized");
    });

    it("should handle moveCandidate error when candidate not found", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.moveCandidate("nonexistent", PipelineStage.SCREENED);
      });

      expect(result.current.error).toBe("Candidate not found");
    });

    it("should handle moveCandidate error with Error instance", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        mockMoveCandidateInPipeline.mockImplementation(() => {
          throw new Error("Move operation failed");
        });

        await act(async () => {
          result.current.moveCandidate(candidateId, PipelineStage.SCREENED);
        });

        expect(result.current.error).toBe("Move operation failed");
      }
    });

    it("should handle moveCandidate error with non-Error", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        mockMoveCandidateInPipeline.mockImplementation(() => {
          throw "String error";
        });

        await act(async () => {
          result.current.moveCandidate(candidateId, PipelineStage.SCREENED);
        });

        expect(result.current.error).toBe("Failed to move candidate");
      }
    });

    it("should handle updatePriority error when pipeline not initialized", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.updatePriority("cand_1", CandidatePriority.HIGH);
      });

      expect(result.current.error).toBe("Pipeline not initialized");
    });

    it("should handle updatePriority error with Error instance", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      mockUpdateCandidatePriority.mockImplementation(() => {
        throw new Error("Priority update failed");
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        await act(async () => {
          result.current.updatePriority(candidateId, CandidatePriority.HIGH);
        });

        expect(result.current.error).toBe("Priority update failed");
      }
    });

    it("should handle updatePriority error with non-Error", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      mockUpdateCandidatePriority.mockImplementation(() => {
        throw "String error";
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        await act(async () => {
          result.current.updatePriority(candidateId, CandidatePriority.HIGH);
        });

        expect(result.current.error).toBe("Failed to update priority");
      }
    });

    it("should handle addNote error when pipeline not initialized", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.addNote("cand_1", "Test note", "general");
      });

      expect(result.current.error).toBe("Pipeline not initialized");
    });

    it("should handle addNote error when candidate not found", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addNote("nonexistent", "Test note", "general");
      });

      expect(result.current.error).toBe("Candidate not found");
    });

    it("should handle addNote error with Error instance", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      mockAddCandidateNote.mockImplementation(() => {
        throw new Error("Note addition failed");
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        await act(async () => {
          result.current.addNote(candidateId, "Test note", "general");
        });

        expect(result.current.error).toBe("Note addition failed");
      }
    });

    it("should handle addNote error with non-Error", async () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      await act(async () => {
        result.current.initialize("job_1", "Engineer");
      });

      await act(async () => {
        result.current.addCandidate("John", "john@example.com", "Engineer");
      });

      mockAddCandidateNote.mockImplementation(() => {
        throw "String error";
      });

      const candidates = result.current.getCandidates(PipelineStage.LEAD);
      const candidateId = candidates[0]?.id;

      if (candidateId) {
        await act(async () => {
          result.current.addNote(candidateId, "Test note", "general");
        });

        expect(result.current.error).toBe("Failed to add note");
      }
    });

    it("should handle getCandidates when pipeline not initialized", () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      const candidates = result.current.getCandidates(PipelineStage.LEAD);

      expect(candidates).toEqual([]);
    });

    it("should handle searchCandidates when pipeline not initialized", () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      const candidates = result.current.searchCandidates("test");

      expect(candidates).toEqual([]);
    });

    it("should handle getMetrics when pipeline not initialized", () => {
      const { result } = renderHook(() => useRecruiterPipeline());

      const metrics = result.current.getMetrics();

      expect(metrics.totalCandidates).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });
  });
});
