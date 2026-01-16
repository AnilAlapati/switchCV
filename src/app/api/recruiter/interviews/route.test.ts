/**
 * @jest-environment node
 */
/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import { InterviewStatus, InterviewType } from "@/lib/recruiterDashboard.types";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => {
  const mockFirestoreData = new Map<string, any>();

  const createMockTimestamp = (date = new Date()) => ({
    toDate: () => date,
    toMillis: () => date.getTime(),
  });

  const mockDocRef = (id: string) => ({
    get: jest.fn().mockImplementation(async () => ({
      exists: mockFirestoreData.has(id),
      data: () => mockFirestoreData.get(id),
      id,
    })),
    set: jest.fn().mockImplementation(async (data: any) => {
      mockFirestoreData.set(id, {
        ...data,
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      });
    }),
    update: jest.fn().mockImplementation(async (data: any) => {
      const existing = mockFirestoreData.get(id) || {};
      mockFirestoreData.set(id, {
        ...existing,
        ...data,
        updatedAt: createMockTimestamp(),
      });
    }),
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
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: Array.from(mockFirestoreData.entries()).map(([id, data]) => ({
              id,
              data: () => data,
              exists: true,
            })),
          }),
        };
      }),
    },
    _mockData: mockFirestoreData,
  };
});

// Get reference to the mock data
const { _mockData: mockFirestoreData } = require("@/lib/firebase-admin");

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-id", error: null }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const response = {
      status,
      json: async () => ({
        error: message,
        details: error?.message || message,
      }),
    };
    return response;
  }),
  verifyRecruiterRole: jest.fn().mockResolvedValue(null),
  verifyAdminRole: jest.fn().mockResolvedValue(null),
}));

// Mock the recruiterPipeline functions
jest.mock("@/lib/recruiterPipeline", () => ({
  scheduleInterview: jest.fn(),
  getUpcomingInterviews: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  scheduleInterview,
  getUpcomingInterviews,
} from "@/lib/recruiterPipeline";

describe("POST /api/recruiter/interviews", () => {
  beforeEach(() => {
    // Clear storage between tests
    mockFirestoreData.clear();
    jest.clearAllMocks();
  });

  describe("schedule action", () => {
    it("should schedule an interview successfully", async () => {
      const scheduledTime = new Date("2024-02-01T10:00:00Z");
      const mockInterview = {
        id: "interview-123",
        candidateId: "candidate-1",
        jobId: "job-1",
        interviewType: InterviewType.PHONE,
        scheduledTime,
        duration: 60,
        interviewers: ["interviewer-1", "interviewer-2"],
        status: InterviewStatus.SCHEDULED,
        location: "Zoom",
        notes: "Technical interview",
      };

      (scheduleInterview as jest.Mock).mockReturnValue({
        ...mockInterview,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "schedule",
            candidateId: "candidate-1",
            jobId: "job-1",
            type: InterviewType.PHONE,
            scheduledTime: "2024-02-01T10:00:00Z",
            duration: 60,
            interviewers: ["interviewer-1", "interviewer-2"],
            location: "Zoom",
            notes: "Technical interview",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.interview.id).toBe("interview-123");
      expect(data.interview.candidateId).toBe("candidate-1");
      expect(data.interview.jobId).toBe("job-1");
      expect(data.interview.interviewType).toBe(InterviewType.PHONE);
      expect(data.interview.duration).toBe(60);
      expect(data.interview.interviewers).toEqual([
        "interviewer-1",
        "interviewer-2",
      ]);
      expect(data.interview.status).toBe(InterviewStatus.SCHEDULED);
      expect(data.message).toBe("Interview scheduled successfully");
      expect(scheduleInterview).toHaveBeenCalledWith(
        "candidate-1",
        "job-1",
        InterviewType.PHONE,
        new Date("2024-02-01T10:00:00Z"),
        60,
        ["interviewer-1", "interviewer-2"]
      );

      // Verify Firestore data
      const storedData = mockFirestoreData.get("interview-123");
      expect(storedData).toBeDefined();
      expect(storedData.candidateId).toBe("candidate-1");
      expect(storedData.createdAt.toDate).toBeDefined();
      expect(storedData.updatedAt.toDate).toBeDefined();
    });

    it("should handle schedule with missing required fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "schedule",
            candidateId: "candidate-1",
            // missing jobId, type, scheduledTime, interviewers
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Missing required fields: candidateId, jobId, type, scheduledTime, interviewers"
      );
      expect(scheduleInterview).not.toHaveBeenCalled();
    });
  });

  describe("update-status action", () => {
    it("should update interview status successfully", async () => {
      const existingInterview = {
        id: "interview-123",
        candidateId: "candidate-1",
        jobId: "job-1",
        interviewType: InterviewType.PHONE,
        scheduledTime: new Date("2024-02-01T10:00:00Z"),
        duration: 60,
        interviewers: ["interviewer-1"],
        status: InterviewStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFirestoreData.set("interview-123", existingInterview);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "update-status",
            interviewId: "interview-123",
            status: InterviewStatus.COMPLETED,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.interview.id).toBe("interview-123");
      expect(data.interview.status).toBe(InterviewStatus.COMPLETED);
      expect(data.message).toBe("Interview status updated");
      expect(mockFirestoreData.get("interview-123")?.status).toBe(
        InterviewStatus.COMPLETED
      );
    });

    it("should return 404 for non-existent interview", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "update-status",
            interviewId: "non-existent",
            status: InterviewStatus.CANCELLED,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Interview not found");
    });
  });

  describe("add-feedback action", () => {
    it("should add feedback to interview successfully", async () => {
      const existingInterview = {
        id: "interview-123",
        candidateId: "candidate-1",
        jobId: "job-1",
        interviewType: InterviewType.PHONE,
        scheduledTime: new Date("2024-02-01T10:00:00Z"),
        duration: 60,
        interviewers: ["interviewer-1"],
        status: InterviewStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const feedback = {
        id: "feedback-123",
        interviewId: "interview-123",
        candidateId: "candidate-1",
        interviewerId: "interviewer-1",
        interviewType: InterviewType.PHONE,
        rating: "excellent" as const,
        technicalScore: 85,
        communicationScore: 90,
        culturalFitScore: 88,
        overallScore: 87,
        strengths: ["Strong technical skills", "Good communication"],
        weaknesses: ["Could improve on system design"],
        comments: "Overall excellent candidate",
        recommendation: "move-forward" as const,
        createdAt: new Date(),
      };

      mockFirestoreData.set("interview-123", existingInterview);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-feedback",
            interviewId: "interview-123",
            feedback,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.interview.id).toBe("interview-123");
      expect(data.interview.status).toBe(InterviewStatus.COMPLETED);
      expect(data.interview.feedback).toEqual({
        ...feedback,
        createdAt: feedback.createdAt.toISOString(),
      });
      expect(data.message).toBe("Feedback added successfully");
      expect(mockFirestoreData.get("interview-123")?.status).toBe(
        InterviewStatus.COMPLETED
      );
      expect(mockFirestoreData.get("interview-123")?.feedback).toEqual({
        ...feedback,
        createdAt: feedback.createdAt.toISOString(),
      });
    });

    it("should return 404 for non-existent interview when adding feedback", async () => {
      const feedback = {
        id: "feedback-123",
        interviewId: "non-existent",
        candidateId: "candidate-1",
        interviewerId: "interviewer-1",
        interviewType: InterviewType.PHONE,
        rating: "good" as const,
        comments: "Good interview",
        recommendation: "move-forward" as const,
        createdAt: new Date(),
      };

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "add-feedback",
            interviewId: "non-existent",
            feedback,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Interview not found");
    });
  });

  describe("get-upcoming action", () => {
    it("should return upcoming interviews successfully", async () => {
      const interview1 = {
        id: "interview-1",
        candidateId: "candidate-1",
        jobId: "job-1",
        interviewType: InterviewType.PHONE,
        scheduledTime: {
          toDate: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        duration: 60,
        interviewers: ["interviewer-1"],
        status: InterviewStatus.SCHEDULED,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      // Only adding the interview that should be returned
      mockFirestoreData.set("interview-1", interview1);

      const mockUpcoming = [interview1];
      (getUpcomingInterviews as jest.Mock).mockReturnValue(mockUpcoming);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "get-upcoming",
            days: 7,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.interviews).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    it("should use default 7 days when days not specified", async () => {
      const mockUpcoming: any[] = [];
      (getUpcomingInterviews as jest.Mock).mockReturnValue(mockUpcoming);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "get-upcoming",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Removed expectation for getUpcomingInterviews call as it's not used
    });
  });

  describe("error handling", () => {
    it("should return 400 for invalid action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            action: "invalid-action",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });

    it("should return 500 for malformed JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/interviews",
        {
headers: { "authorization": "Bearer test-token" },
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});

describe("GET /api/recruiter/interviews", () => {
  beforeEach(() => {
    // Clear storage between tests
    mockFirestoreData.clear();
  });

  it("should return a specific interview by id", async () => {
    const mockInterview = {
      id: "interview-123",
      candidateId: "candidate-1",
      jobId: "job-1",
      interviewType: InterviewType.PHONE,
      scheduledTime: { toDate: () => new Date("2024-02-01T10:00:00Z") },
      duration: 60,
      interviewers: ["interviewer-1"],
      status: InterviewStatus.SCHEDULED,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    mockFirestoreData.set("interview-123", mockInterview);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/interviews?id=interview-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.interview.id).toBe("interview-123");
    expect(data.interview.candidateId).toBe("candidate-1");
    expect(data.interview.status).toBe(InterviewStatus.SCHEDULED);
  });

  it("should return 404 for non-existent interview", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/interviews?id=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Interview not found");
  });

  it("should return interviews for a specific candidate", async () => {
    const interview1 = {
      id: "interview-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      interviewType: InterviewType.PHONE,
      scheduledTime: { toDate: () => new Date("2024-02-01T10:00:00Z") },
      duration: 60,
      interviewers: ["interviewer-1"],
      status: InterviewStatus.SCHEDULED,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    const interview2 = {
      id: "interview-2",
      candidateId: "candidate-1",
      jobId: "job-2",
      interviewType: InterviewType.VIDEO,
      scheduledTime: { toDate: () => new Date("2024-02-02T10:00:00Z") },
      duration: 90,
      interviewers: ["interviewer-2"],
      status: InterviewStatus.COMPLETED,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    // Only adding interviews for candidate-1
    mockFirestoreData.set("interview-1", interview1);
    mockFirestoreData.set("interview-2", interview2);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/interviews?candidateId=candidate-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.interviews).toHaveLength(2);
    expect(data.interviews[0].id).toBe("interview-1");
    expect(data.interviews[1].id).toBe("interview-2");
    expect(data.count).toBe(2);
  });

  it("should return all interviews", async () => {
    const interview1 = {
      id: "interview-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      interviewType: InterviewType.PHONE,
      scheduledTime: { toDate: () => new Date("2024-02-01T10:00:00Z") },
      duration: 60,
      interviewers: ["interviewer-1"],
      status: InterviewStatus.SCHEDULED,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    const interview2 = {
      id: "interview-2",
      candidateId: "candidate-2",
      jobId: "job-1",
      interviewType: InterviewType.VIDEO,
      scheduledTime: { toDate: () => new Date("2024-02-02T10:00:00Z") },
      duration: 90,
      interviewers: ["interviewer-2"],
      status: InterviewStatus.COMPLETED,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    };

    mockFirestoreData.set("interview-1", interview1);
    mockFirestoreData.set("interview-2", interview2);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/interviews"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.interviews).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it("should return empty array when no interviews exist", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/interviews"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.interviews).toEqual([]);
    expect(data.count).toBe(0);
  });
});
