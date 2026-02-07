import { POST, GET } from "@/app/api/interview/assistant/route";
import { NextRequest } from "next/server";
import {
  createInterviewSession,
  getInterviewTips,
} from "@/lib/interviewSession";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

jest.mock("@/lib/interviewSession", () => ({
  createInterviewSession: jest.fn(),
  getInterviewTips: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Interview Assistant API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });
  });

  describe("POST", () => {
    it("should start a session successfully", async () => {
      const mockSession = { id: "session-123", jobTitle: "Software Engineer" };
      (createInterviewSession as jest.Mock).mockReturnValue(mockSession);

      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "start-session",
            userId: "user-123",
            jobTitle: "Software Engineer",
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockSession);
    });

    it("should return 400 if userId or jobTitle is missing in start-session", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "start-session",
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should submit an answer successfully", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "submit-answer",
            sessionId: "session-123",
            questionIndex: 0,
            answer: "My answer",
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 400 if sessionId, questionIndex, or answer is missing in submit-answer", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "submit-answer",
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should complete a session successfully", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "complete-session",
            sessionId: "session-123",
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 400 if sessionId is missing in complete-session", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "complete-session",
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid action", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "invalid",
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should handle errors in POST", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("JSON error")),
      } as any;

      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("should return tips successfully", async () => {
      const mockTips = ["Tip 1", "Tip 2"];
      (getInterviewTips as jest.Mock).mockReturnValue(mockTips);

      const req = new NextRequest(
        new URL(
          "http://localhost:3000/api/interview/assistant?action=tips&jobTitle=Engineer"
        ),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTips);
    });

    it("should return 400 for invalid action in GET", async () => {
      const req = new NextRequest(
        new URL("http://localhost:3000/api/interview/assistant?action=invalid"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      expect(response.status).toBe(400);
    });

    it("should handle errors in GET", async () => {
      // Mock URL to throw or something
      const req = {
        url: "invalid-url",
      } as any;

      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });
});
