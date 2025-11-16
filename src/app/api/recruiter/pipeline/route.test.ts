/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  PipelineStage,
  CandidatePriority,
} from "@/lib/recruiterDashboard.types";

// Mock the pipeline helper functions
jest.mock("@/lib/recruiterPipeline", () => ({
  createCandidate: jest.fn(),
  getCandidatesByStage: jest.fn(),
}));

jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  initializePipeline: jest.fn(),
  addCandidateToPipeline: jest.fn(),
  moveCandidateInPipeline: jest.fn(),
}));

import { createCandidate, getCandidatesByStage } from "@/lib/recruiterPipeline";
import {
  initializePipeline,
  addCandidateToPipeline,
  moveCandidateInPipeline,
} from "@/lib/recruiterPipelineHelpers";

const mockCreateCandidate = createCandidate as jest.MockedFunction<
  typeof createCandidate
>;
const mockGetCandidatesByStage = getCandidatesByStage as jest.MockedFunction<
  typeof getCandidatesByStage
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

describe("POST /api/recruiter/pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize action", () => {
    it("should initialize a pipeline successfully", async () => {
      const mockPipeline = {
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [],
        totalCandidates: 0,
      };

      mockInitializePipeline.mockReturnValue(mockPipeline);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobId: "job-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        pipeline: mockPipeline,
        message: "Pipeline initialized successfully",
      });
      expect(mockInitializePipeline).toHaveBeenCalledWith(
        "job-123",
        "Software Engineer"
      );
    });

    it("should handle initialize with missing jobId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobTitle: "Software Engineer",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Missing required fields: jobId and jobTitle",
      });
    });
  });

  describe("add-candidate action", () => {
    it("should add candidate to existing pipeline", async () => {
      const mockCandidate = {
        id: "candidate-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Developer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedPipeline = {
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [],
        totalCandidates: 1,
      };

      mockCreateCandidate.mockReturnValue(mockCandidate);
      mockAddCandidateToPipeline.mockReturnValue(mockUpdatedPipeline);

      // Mock the in-memory storage by setting up the pipeline first
      const initRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobId: "job-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      mockInitializePipeline.mockReturnValue({
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [],
        totalCandidates: 0,
      });

      await POST(initRequest);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "add-candidate",
            pipelineId: "pipeline-123",
            name: "John Doe",
            email: "john@example.com",
            position: "Developer",
            phone: "+1234567890",
            resumeUrl: "https://example.com/resume.pdf",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        candidate: {
          ...mockCandidate,
          createdAt: mockCandidate.createdAt.toISOString(),
          updatedAt: mockCandidate.updatedAt.toISOString(),
        },
        totalCandidates: 1,
        message: "Candidate added successfully",
      });
      expect(mockCreateCandidate).toHaveBeenCalledWith(
        "John Doe",
        "john@example.com",
        "Developer",
        "+1234567890",
        "https://example.com/resume.pdf"
      );
      expect(mockAddCandidateToPipeline).toHaveBeenCalled();
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "add-candidate",
            pipelineId: "non-existent-pipeline",
            name: "John Doe",
            email: "john@example.com",
            position: "Developer",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Pipeline not found" });
    });
  });

  describe("move-candidate action", () => {
    it("should move candidate to new stage", async () => {
      const mockCandidate = {
        id: "candidate-123",
        name: "John Doe",
        email: "john@example.com",
        position: "Developer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedPipeline = {
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [
          {
            stage: PipelineStage.SCREENED,
            candidates: [{ ...mockCandidate, stage: PipelineStage.SCREENED }],
            count: 1,
            stageOrder: 1,
          },
        ],
        totalCandidates: 1,
      };

      mockMoveCandidateInPipeline.mockReturnValue(mockUpdatedPipeline);

      // Initialize pipeline first
      const initRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobId: "job-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      mockInitializePipeline.mockReturnValue({
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [
          {
            stage: PipelineStage.LEAD,
            candidates: [mockCandidate],
            count: 1,
            stageOrder: 0,
          },
        ],
        totalCandidates: 1,
      });

      await POST(initRequest);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "move-candidate",
            pipelineId: "pipeline-123",
            candidateId: "candidate-123",
            newStage: "screened",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        candidate: {
          ...mockCandidate,
          stage: "screened",
          createdAt: mockCandidate.createdAt.toISOString(),
          updatedAt: mockCandidate.updatedAt.toISOString(),
        },
        message: "Candidate moved successfully",
      });
      expect(mockMoveCandidateInPipeline).toHaveBeenCalled();
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "move-candidate",
            pipelineId: "non-existent-pipeline",
            candidateId: "candidate-123",
            newStage: "screened",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Pipeline not found" });
    });

    it("should return 404 for non-existent candidate", async () => {
      // Initialize pipeline first
      const initRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobId: "job-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      mockInitializePipeline.mockReturnValue({
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [],
        totalCandidates: 0,
      });

      await POST(initRequest);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "move-candidate",
            pipelineId: "pipeline-123",
            candidateId: "non-existent-candidate",
            newStage: "screened",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Candidate not found" });
    });
  });

  describe("get-stage action", () => {
    it("should return candidates for a specific stage", async () => {
      const mockCandidates = [
        {
          id: "candidate-123",
          name: "John Doe",
          email: "john@example.com",
          position: "Developer",
          stage: PipelineStage.SCREENED,
          priority: CandidatePriority.MEDIUM,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetCandidatesByStage.mockReturnValue(mockCandidates);

      // Initialize pipeline first
      const initRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "initialize",
            jobId: "job-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      mockInitializePipeline.mockReturnValue({
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [],
        totalCandidates: 0,
      });

      await POST(initRequest);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-stage",
            pipelineId: "pipeline-123",
            stage: "screened",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        stage: "screened",
        candidates: mockCandidates.map((candidate) => ({
          ...candidate,
          createdAt: candidate.createdAt.toISOString(),
          updatedAt: candidate.updatedAt.toISOString(),
        })),
        count: 1,
      });
      expect(mockGetCandidatesByStage).toHaveBeenCalled();
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-stage",
            pipelineId: "non-existent-pipeline",
            stage: "screened",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Pipeline not found" });
    });
  });

  describe("error handling", () => {
    it("should return 400 for invalid action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            action: "invalid-action",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid action" });
    });

    it("should return 500 for malformed JSON", async () => {
      // Mock request.json() to throw an error
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as any;

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });

    it("should handle missing action field", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          method: "POST",
          body: JSON.stringify({
            jobId: "job-123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid action" });
    });
  });
});
