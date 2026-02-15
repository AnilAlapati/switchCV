import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/recruiter/pipeline/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { createCandidate } from "@/lib/recruiterPipeline";
import { generatePipelineId } from "@/lib/recruiterPipelineHelpers";
import { PipelineStage } from "@/lib/recruiterDashboard.types";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue("mock-timestamp"),
    increment: jest.fn().mockReturnValue("mock-increment"),
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
}));

jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  generatePipelineId: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Pipeline API", () => {
  const mockUserId = "recruiter-123";
  const mockPipelineId = "pipeline-456";
  const mockCandidateId = "candidate-789";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (generatePipelineId as jest.Mock).mockReturnValue(mockPipelineId);

    // Mock user role check
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
        collection: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          id: mockPipelineId,
          exists: true,
          data: () => ({ jobId: "job-1", jobTitle: "Engineer", recruiterId: mockUserId }),
          docs: [],
        }),
      };
    });
  });

  describe("POST /api/recruiter/pipeline", () => {
    it("should initialize a pipeline", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/pipeline", {
        method: "POST",
        body: JSON.stringify({
          action: "initialize",
          jobId: "job-1",
          jobTitle: "Engineer",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pipeline.id).toBe(mockPipelineId);
    });

    it("should add a candidate to a pipeline", async () => {
      const mockCandidate = {
        id: mockCandidateId,
        name: "John Doe",
        stage: PipelineStage.LEAD,
      };
      (createCandidate as jest.Mock).mockReturnValue(mockCandidate);

      const req = new NextRequest("http://localhost/api/recruiter/pipeline", {
        method: "POST",
        body: JSON.stringify({
          action: "add-candidate",
          pipelineId: mockPipelineId,
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

    it("should move a candidate in a pipeline", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/pipeline", {
        method: "POST",
        body: JSON.stringify({
          action: "move-candidate",
          pipelineId: mockPipelineId,
          candidateId: mockCandidateId,
          newStage: PipelineStage.INTERVIEWED,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidate.stage).toBe(PipelineStage.INTERVIEWED);
    });

    it("should get candidates for a stage", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/pipeline", {
        method: "POST",
        body: JSON.stringify({
          action: "get-stage",
          pipelineId: mockPipelineId,
          stage: PipelineStage.LEAD,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stage).toBe(PipelineStage.LEAD);
    });

    it("should return 400 for invalid action", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/pipeline", {
        method: "POST",
        body: JSON.stringify({ action: "invalid" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/recruiter/pipeline", () => {
    it("should fetch a pipeline by ID", async () => {
      const req = new NextRequest(
        `http://localhost/api/recruiter/pipeline?id=${mockPipelineId}`
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pipeline.id).toBe(mockPipelineId);
    });

    it("should return 404 if pipeline not found", async () => {
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
        `http://localhost/api/recruiter/pipeline?id=nonexistent`
      );
      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });
});
