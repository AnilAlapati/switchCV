import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/recruiter/interviews/route";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { scheduleInterview } from "@/lib/recruiterPipeline";
import { InterviewStatus } from "@/lib/recruiterDashboard.types";

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
  scheduleInterview: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Recruiter Interviews API", () => {
  const mockUserId = "recruiter-123";
  const mockInterviewId = "interview-456";
  const mockCandidateId = "candidate-789";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock verifyRecruiterRole
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
          data: () => ({
            id: mockInterviewId,
            status: InterviewStatus.SCHEDULED,
          }),
        }),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
      };
    });
  });

  describe("POST /api/recruiter/interviews", () => {
    it("should schedule an interview", async () => {
      const mockInterview = {
        id: mockInterviewId,
        candidateId: mockCandidateId,
      };
      (scheduleInterview as jest.Mock).mockReturnValue(mockInterview);

      const req = new NextRequest("http://localhost/api/recruiter/interviews", {
        method: "POST",
        body: JSON.stringify({
          action: "schedule",
          candidateId: mockCandidateId,
          jobId: "job-1",
          type: "coding",
          scheduledTime: new Date().toISOString(),
          duration: 60,
          interviewers: ["interviewer-1"],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interview.id).toBe(mockInterviewId);
    });

    it("should update interview status", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/interviews", {
        method: "POST",
        body: JSON.stringify({
          action: "update-status",
          interviewId: mockInterviewId,
          status: InterviewStatus.COMPLETED,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interview.status).toBe(InterviewStatus.COMPLETED);
    });

    it("should add feedback to an interview", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/interviews", {
        method: "POST",
        body: JSON.stringify({
          action: "add-feedback",
          interviewId: mockInterviewId,
          feedback: { rating: 5, comments: "Excellent" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interview.status).toBe(InterviewStatus.COMPLETED);
    });

    it("should get upcoming interviews", async () => {
      const mockInterviewData = {
        scheduledTime: { toDate: () => new Date() },
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
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: mockInterviewId,
                exists: true,
                data: () => mockInterviewData,
              },
            ],
          }),
        };
      });

      const req = new NextRequest("http://localhost/api/recruiter/interviews", {
        method: "POST",
        body: JSON.stringify({
          action: "get-upcoming",
          days: 7,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interviews).toHaveLength(1);
    });

    it("should return 400 for invalid action", async () => {
      const req = new NextRequest("http://localhost/api/recruiter/interviews", {
        method: "POST",
        body: JSON.stringify({ action: "invalid" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/recruiter/interviews", () => {
    it("should fetch a single interview", async () => {
      const mockInterviewData = {
        scheduledTime: { toDate: () => new Date() },
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
          doc: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            id: mockInterviewId,
            exists: true,
            data: () => mockInterviewData,
          }),
        };
      });

      const req = new NextRequest(
        `http://localhost/api/recruiter/interviews?id=${mockInterviewId}`
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interview.id).toBe(mockInterviewId);
    });

    it("should fetch interviews for a candidate", async () => {
      const mockInterviewData = {
        scheduledTime: { toDate: () => new Date() },
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
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: mockInterviewId,
                exists: true,
                data: () => mockInterviewData,
              },
            ],
          }),
        };
      });

      const req = new NextRequest(
        `http://localhost/api/recruiter/interviews?candidateId=${mockCandidateId}`
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.interviews).toHaveLength(1);
    });

    it("should return 404 if interview not found", async () => {
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
        `http://localhost/api/recruiter/interviews?id=nonexistent`
      );
      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });
});
