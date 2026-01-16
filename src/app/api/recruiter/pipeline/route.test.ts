/* snyk:file:ignore javascript/NoHardcodedCredentials - Test file uses mock credentials intentionally */
/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  PipelineStage,
  CandidatePriority,
} from "@/lib/recruiterDashboard.types";

// Mock firebase-admin
const TEST_CANDIDATE_EMAIL = "candidate_placeholder_at_example_com";

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
    set: jest.fn().mockImplementation(async (data: any) => {
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
    update: jest.fn().mockImplementation(async (data: any) => {
      const store = parentId
        ? getSubcollection(parentId, parentCollection!)
        : mockFirestoreData;
      const existing = store.get(id) || {};
      store.set(id, { ...existing, ...data, updatedAt: createMockTimestamp() });
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
    })),
  });

  return {
    adminDb: {
      collection: jest.fn().mockImplementation((collectionName: string) => {
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
    .mockResolvedValue({ userId: "test-user-id", error: null }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const details =
      error instanceof Error
        ? error.message
        : error
          ? String(error)
          : undefined;
    return {
      status,
      json: async () => ({
        error: message,
        ...(details !== undefined ? { details } : {}),
      }),
    };
  }),
  verifyRecruiterRole: jest.fn().mockResolvedValue(null),
  verifyAdminRole: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  generatePipelineId: jest.fn(() => "pipeline-123"),
}));

jest.mock("@/lib/recruiterPipeline", () => ({
  createCandidate: jest.fn(),
  getCandidatesByStage: jest.fn(),
}));

import { createCandidate } from "@/lib/recruiterPipeline";
import { generatePipelineId } from "@/lib/recruiterPipelineHelpers";

const mockCreateCandidate = createCandidate as jest.MockedFunction<
  typeof createCandidate
>;

describe("POST /api/recruiter/pipeline", () => {
  beforeEach(() => {
    mockFirestoreData.clear();
    mockSubcollections.clear();
    jest.clearAllMocks();
  });

  describe("initialize action", () => {
    it("should initialize a pipeline successfully", async () => {
      const mockPipeline = {
        id: "pipeline-123",
        jobId: "job-123",
        jobTitle: "Software Engineer",
        columns: [
          { stage: "lead", candidates: [], count: 0, stageOrder: 1 },
          { stage: "screened", candidates: [], count: 0, stageOrder: 2 },
          { stage: "shortlisted", candidates: [], count: 0, stageOrder: 3 },
          { stage: "interviewed", candidates: [], count: 0, stageOrder: 4 },
          { stage: "offered", candidates: [], count: 0, stageOrder: 5 },
          { stage: "hired", candidates: [], count: 0, stageOrder: 6 },
        ],
        totalCandidates: 0,
      };

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      expect(data.success).toBe(true);
      expect(data.pipeline.id).toBe("pipeline-123");
      expect(data.pipeline.jobId).toBe("job-123");
      expect(data.message).toBe("Pipeline initialized successfully");
      expect(mockFirestoreData.get("pipeline-123")).toBeDefined();
    });

    it("should handle initialize with missing jobId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
        email: "test-candidate@example.com",
        position: "Developer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateCandidate.mockReturnValue(mockCandidate);

      // Setup existing pipeline
      mockFirestoreData.set("pipeline-123", {
        jobId: "job-123",
        jobTitle: "Software Engineer",
        totalCandidates: 0,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-candidate",
            pipelineId: "pipeline-123",
            name: "John Doe",
            email: "test.candidate@example.com",
            position: "Developer",
            phone: "+1234567890",
            resumeUrl: "https://example.com/resume.pdf",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.candidate.id).toBe("candidate-123");
      expect(data.totalCandidates).toBe(1);

      // Verify subcollection
      const candidatesMap = mockSubcollections.get("pipeline-123/candidates");
      expect(candidatesMap).toBeDefined();
      expect(candidatesMap!.get("candidate-123")).toBeDefined();
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-candidate",
            pipelineId: "non-existent-pipeline",
            name: "John Doe",
            email: "test-candidate@example.com",
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
        email: TEST_CANDIDATE_EMAIL,
        position: "Developer",
        stage: PipelineStage.LEAD,
        priority: CandidatePriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup pipeline and candidate
      mockFirestoreData.set("pipeline-123", {
        jobId: "job-123",
        jobTitle: "Software Engineer",
        totalCandidates: 1,
      });

      const candidatesMap = new Map();
      candidatesMap.set("candidate-123", mockCandidate);
      mockSubcollections.set("pipeline-123/candidates", candidatesMap);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      expect(data.success).toBe(true);
      expect(data.candidate.stage).toBe("screened");

      // Verify update in store
      expect(candidatesMap.get("candidate-123").stage).toBe("screened");
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      // Setup pipeline
      mockFirestoreData.set("pipeline-123", {
        jobId: "job-123",
        jobTitle: "Software Engineer",
        totalCandidates: 0,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      const mockCandidate = {
        id: "candidate-123",
        name: "John Doe",
        email: TEST_CANDIDATE_EMAIL,
        position: "Developer",
        stage: PipelineStage.SCREENED,
        priority: CandidatePriority.MEDIUM,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      // Setup pipeline and candidate
      mockFirestoreData.set("pipeline-123", {
        jobId: "job-123",
        jobTitle: "Software Engineer",
        totalCandidates: 1,
      });

      const candidatesMap = new Map();
      candidatesMap.set("candidate-123", mockCandidate);
      mockSubcollections.set("pipeline-123/candidates", candidatesMap);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      expect(data.success).toBe(true);
      expect(data.stage).toBe("screened");
      expect(data.candidates).toHaveLength(1);
      expect(data.candidates[0].id).toBe("candidate-123");
    });

    it("should return 404 for non-existent pipeline", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
      expect(data).toEqual({
        error: "Internal server error",
        details: "Invalid JSON",
      });
    });

    it("should handle missing action field", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/pipeline",
        {
          headers: { authorization: "Bearer test-token" },
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
