/**
 * Interview Assistant API Route Tests
 */

import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/interview/assistant/route";

jest.mock("@/lib/interviewSession", () => ({
  createInterviewSession: jest.fn(),
  getInterviewTips: jest.fn(),
}));

import {
  createInterviewSession,
  getInterviewTips,
} from "@/lib/interviewSession";

const mockCreateInterviewSession =
  createInterviewSession as jest.MockedFunction<typeof createInterviewSession>;
const mockGetInterviewTips = getInterviewTips as jest.MockedFunction<
  typeof getInterviewTips
>;

describe("POST /api/interview/assistant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should create interview session", async () => {
    const mockSession = {
      id: "session-123",
      userId: "user-123",
      jobTitle: "Engineer",
      status: "pending" as const,
      questions: [],
      answers: [],
      startTime: expect.any(String),
      duration: 15,
    };
    mockCreateInterviewSession.mockReturnValue({
      id: "session-123",
      userId: "user-123",
      jobTitle: "Engineer",
      status: "pending" as const,
      questions: [],
      answers: [],
      startTime: new Date(),
      duration: 15,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({
          action: "start-session",
          userId: "user-123",
          jobTitle: "Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(mockSession);
  });

  it("should return 400 for missing required fields", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({ action: "start-session", jobTitle: "Engineer" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("userId and jobTitle are required");
  });

  it("should submit answer successfully", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({
          action: "submit-answer",
          sessionId: "session-123",
          questionIndex: 0,
          answer: "My answer",
          duration: 120,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 400 for missing answer fields", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({
          action: "submit-answer",
          sessionId: "session-123",
          questionIndex: 0,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "sessionId, questionIndex, and answer are required"
    );
  });

  it("should complete session successfully", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({
          action: "complete-session",
          sessionId: "session-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 400 for invalid action", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: JSON.stringify({ action: "invalid" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid action. Use: start-session, submit-answer, or complete-session"
    );
  });

  it("should handle invalid JSON", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant",
      {
        method: "POST",
        body: "invalid json",
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid action. Use: start-session, submit-answer, or complete-session"
    );
  });
});

describe("GET /api/interview/assistant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return interview tips", async () => {
    const mockTips = {
      general: ["Tip 1"],
      technical: ["Tech tip"],
      behavioral: ["Behavioral tip"],
      roleSpecific: ["Role tip"],
      communication: ["Communication tip"],
      confidence: ["Confidence tip"],
    };
    mockGetInterviewTips.mockReturnValue(mockTips);

    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant?action=tips",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockTips);
  });

  it("should pass jobTitle parameter", async () => {
    const mockTips = {
      general: ["Tip 1"],
      technical: ["Tech tip"],
      behavioral: ["Behavioral tip"],
      roleSpecific: ["Engineer tip"],
      communication: ["Communication tip"],
      confidence: ["Confidence tip"],
    };
    mockGetInterviewTips.mockReturnValue(mockTips);

    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant?action=tips&jobTitle=Engineer",
      { method: "GET" }
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetInterviewTips).toHaveBeenCalledWith("Engineer");
  });

  it("should return 400 for invalid action", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/interview/assistant?action=invalid",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid action. Use: ?action=tips");
  });
});
