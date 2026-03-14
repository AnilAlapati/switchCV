import {
  generateTextWithTier,
  getModelsForTier,
  getSelectableModels,
} from "@/lib/services/aiProviderService";

const mockPersistAIFailureEvent = jest.fn().mockResolvedValue("event-1");
const mockMarkAIStageSuccess = jest.fn().mockResolvedValue(undefined);
const mockMarkAIStageFailed = jest.fn();

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Secret Manager so provider fallback to getSecret also returns ""
jest.mock("@/lib/services/secretManagerService", () => ({
  getSecret: jest.fn().mockResolvedValue(""),
}));

// Mock retry to just execute the function immediately
jest.mock("@/lib/utils/retry", () => ({
  withRetry: jest.fn((fn) => fn()),
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: jest.fn((input: { errorMessage?: string }) => ({
    failureCode: "AI_PROVIDER_5XX",
    errorMessage: input.errorMessage ?? "Unknown error",
  })),
  markAIStageFailed: (...args: unknown[]) => mockMarkAIStageFailed(...args),
  markAIStageSuccess: (...args: unknown[]) => mockMarkAIStageSuccess(...args),
  noteAIStageAttempt: jest.fn(),
  persistAIFailureEvent: (...args: unknown[]) =>
    mockPersistAIFailureEvent(...args),
}));

const observationContext = {
  requestId: "req-123",
  sessionId: "session-123",
  userIdHash: "hash-123",
  userTier: "enterprise" as const,
  entrypoint: "resume_generate",
  deployVersion: "test-build",
  environment: "test",
  conversationTurn: 1,
  startedAt: new Date("2026-03-13T12:00:00Z"),
  stages: {},
  failureCount: 0,
  fallbackCount: 0,
};

describe("AI Provider Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-openai",
      GEMINI_API_KEY: "test-google",
      ANTHROPIC_API_KEY: "test-anthropic",
      XAI_API_KEY: "test-xai",
    };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockSuccessResponse = (text: string | null) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: text ? [{ message: { content: text } }] : [],
          candidates: text ? [{ content: { parts: [{ text }] } }] : [],
          content: text ? [{ text }] : [],
        }),
    } as Response);

  const mockErrorResponse = (status: number, text: string) =>
    Promise.resolve({
      ok: false,
      status,
      text: () => Promise.resolve(text),
    } as Response);

  describe("Tier Management", () => {
    it("should return correct models and sort for basic", () => {
      const models = getModelsForTier("basic");
      expect(models.length).toBeGreaterThan(0);
    });

    it("should return all for enterprise", () => {
      const models = getModelsForTier("enterprise");
      expect(models.length).toBeGreaterThan(5);
    });

    it("should return selectable models correctly", () => {
      const models = getSelectableModels("enterprise");
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("Successful Provider Calls", () => {
    it("should work with OpenAI", async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockSuccessResponse("ok"));
      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        modelId: "gpt-4o",
      });
      expect(res.text).toBe("ok");
      expect(res.provider).toBe("openai");
    });

    it("should work with Google/Gemini", async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockSuccessResponse("ok"));
      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        modelId: "gemini-2.5-pro",
      });
      expect(res.text).toBe("ok");
      expect(res.provider).toBe("google");
    });

    it("should work with Anthropic", async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockSuccessResponse("ok"));
      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        modelId: "claude-3-5-sonnet",
      });
      expect(res.text).toBe("ok");
      expect(res.provider).toBe("anthropic");
    });

    it("should work with xAI", async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockSuccessResponse("ok"));
      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        modelId: "grok-beta",
      });
      expect(res.text).toBe("ok");
      expect(res.provider).toBe("xai");
    });
  });

  describe("Error Scenarios", () => {
    it("should fail if no models available", async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.XAI_API_KEY;
      await expect(
        generateTextWithTier({ prompt: "p", userTier: "basic" }),
      ).rejects.toThrow(/unavailable/);
    });

    it("should retry and fallback", async () => {
      (global.fetch as jest.Mock)
        .mockReturnValueOnce(mockErrorResponse(500, "Fail 1"))
        .mockReturnValueOnce(mockSuccessResponse("Success 2"));

      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        observationContext,
      });
      expect(res.text).toBe("Success 2");
      expect(mockPersistAIFailureEvent).toHaveBeenCalled();
      expect(mockMarkAIStageSuccess).toHaveBeenCalled();
    });

    it("should handle Anthropic specific error", async () => {
      (global.fetch as jest.Mock).mockReturnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ content: [] }),
        }),
      );
      await expect(
        generateTextWithTier({
          prompt: "p",
          userTier: "enterprise",
          modelId: "claude-3-5-sonnet",
        }),
      ).rejects.toThrow(/All AI providers failed/);
    });

    it("should throw friendly error for basic user when all fail", async () => {
      (global.fetch as jest.Mock).mockReturnValue(
        mockErrorResponse(500, "Fail"),
      );
      await expect(
        generateTextWithTier({ prompt: "p", userTier: "basic" }),
      ).rejects.toThrow(/currently unavailable/);
    });
  });

  describe("Circuit Breaker", () => {
    it("should skip openai after multiple failures", async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u.includes("openai")) return mockErrorResponse(500, "Fail");
        return mockSuccessResponse("Safe");
      });

      for (let i = 0; i < 3; i++) {
        try {
          await generateTextWithTier({
            prompt: "p",
            userTier: "enterprise",
            modelId: "gpt-4o",
          });
        } catch (e) {}
      }

      const res = await generateTextWithTier({
        prompt: "p",
        userTier: "enterprise",
        modelId: "gpt-4o",
        observationContext,
      });
      expect(res.provider).not.toBe("openai");
      expect(res.text).toBe("Safe");
      expect(mockPersistAIFailureEvent).toHaveBeenCalled();
    });
  });
});
