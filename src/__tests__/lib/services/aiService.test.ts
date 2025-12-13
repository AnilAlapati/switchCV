import {
  initializeAIGreeting,
  generateQuestionForStage,
} from "../../../lib/services/aiService";
import { FALLBACK_RESPONSES } from "../../../lib/utils/aiPrompts";

// Mock firebase/auth
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe("aiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializeAIGreeting", () => {
    it("should return AI greeting on success", async () => {
      const mockResponse = { text: "Hello!", model: "gpt-4" };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await initializeAIGreeting();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/ai/generate"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        })
      );
    });

    it("should throw error on API failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: jest.fn().mockResolvedValue({ message: "Some error" }),
      });

      await expect(initializeAIGreeting()).rejects.toThrow("Some error");
    });
  });

  describe("generateQuestionForStage", () => {
    const mockResumeData = {
      basics: { name: "John", email: "john@example.com" },
    } as any;

    it("should return generated question on success", async () => {
      const mockResponse = { text: "What is your experience?" };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await generateQuestionForStage(
        "experience",
        mockResumeData
      );

      expect(result).toBe("What is your experience?");
    });

    it("should return fallback response on error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await generateQuestionForStage(
        "experience",
        mockResumeData
      );

      expect(result).toBe(FALLBACK_RESPONSES["experience"]);
    });

    it("should return fallback response on API failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await generateQuestionForStage(
        "experience",
        mockResumeData
      );

      expect(result).toBe(FALLBACK_RESPONSES["experience"]);
    });
  });
});
