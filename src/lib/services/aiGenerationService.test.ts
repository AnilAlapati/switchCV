import { generateText, generateEmbedding } from "./aiGenerationService";
import { providerFallback } from "@/lib/services/ai/ProviderFallbackChain";
import { aiCircuitBreaker } from "@/lib/services/ai/CircuitBreaker";
import { generateWithGemini } from "./ai/providers/gemini";
import { generateWithOpenAI } from "./ai/providers/openai";
import { generateWithGroq } from "./ai/providers/groq";
import { fetchWithTimeout, checkGlobalSafetyLimit } from "./ai/core-utils";

// Mock Dependencies
jest.mock("@/lib/services/ai/ProviderFallbackChain", () => ({
    providerFallback: {
        getPrioritizedProviders: jest.fn(),
        reportSuccess: jest.fn(),
        reportFailure: jest.fn(),
    },
}));

jest.mock("@/lib/services/ai/CircuitBreaker", () => ({
    aiCircuitBreaker: {
        recordSuccess: jest.fn(),
        recordFailure: jest.fn(),
    },
}));

jest.mock("./ai/providers/gemini", () => ({
    generateWithGemini: jest.fn(),
}));

jest.mock("./ai/providers/openai", () => ({
    generateWithOpenAI: jest.fn(),
}));

jest.mock("./ai/providers/groq", () => ({
    generateWithGroq: jest.fn(),
}));

jest.mock("./ai/core-utils", () => ({
    fetchWithTimeout: jest.fn(),
    checkGlobalSafetyLimit: jest.fn(),
}));

jest.mock("@/lib/services/secretManagerService", () => ({
    getSecret: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

jest.mock("@/config/aiEndpoints", () => ({
    AI_ENDPOINTS: {
        GEMINI: {
            EMBED: jest.fn((model, key) => `https://api.gemini.com/embed/${model}?key=${key}`),
        },
    },
}));

describe("aiGenerationService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("generateText", () => {
        it("uses the first prioritized provider if successful", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["gemini", "openai"]);
            (generateWithGemini as jest.Mock).mockResolvedValue({
                text: "Gemini Result",
                model: "gemini-pro",
                usage: { totalTokens: 10 },
            });

            const result = await generateText("prompt");

            expect(result.text).toBe("Gemini Result");
            expect(result.provider).toBe("gemini");
            expect(generateWithGemini).toHaveBeenCalledWith("prompt", 150, 0.7, undefined);
            expect(generateWithOpenAI).not.toHaveBeenCalled();
            expect(providerFallback.reportSuccess).toHaveBeenCalledWith("gemini", expect.any(Number));
            expect(aiCircuitBreaker.recordSuccess).toHaveBeenCalledWith("gemini");
        });

        it("falls back to next provider on failure", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["gemini", "openai"]);

            // Gemini Fails
            (generateWithGemini as jest.Mock).mockRejectedValue(new Error("Gemini Down"));

            // OpenAI Succeeds
            (generateWithOpenAI as jest.Mock).mockResolvedValue({
                text: "OpenAI Result",
                model: "gpt-4",
            });

            const result = await generateText("prompt");

            expect(result.text).toBe("OpenAI Result");
            expect(result.provider).toBe("openai");

            expect(generateWithGemini).toHaveBeenCalled();
            expect(providerFallback.reportFailure).toHaveBeenCalledWith("gemini");
            expect(aiCircuitBreaker.recordFailure).toHaveBeenCalledWith("gemini");

            expect(generateWithOpenAI).toHaveBeenCalled();
            expect(providerFallback.reportSuccess).toHaveBeenCalledWith("openai", expect.any(Number));
        });

        it("throws error if all providers fail", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["gemini"]);
            (generateWithGemini as jest.Mock).mockRejectedValue(new Error("Down"));

            await expect(generateText("prompt")).rejects.toThrow(/All AI providers failed/);
        });

        it("calls checkGlobalSafetyLimit", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["gemini"]);
            (generateWithGemini as jest.Mock).mockResolvedValue({ text: "ok" });

            await generateText("prompt");
            expect(checkGlobalSafetyLimit).toHaveBeenCalled();
        });

        it("supports groq provider", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["groq"]);
            (generateWithGroq as jest.Mock).mockResolvedValue({ text: "Groq Result", model: "mixtral" });

            const result = await generateText("prompt");
            expect(result.provider).toBe("groq");
            expect(generateWithGroq).toHaveBeenCalled();
        });

        it("throws on unknown provider", async () => {
            (providerFallback.getPrioritizedProviders as jest.Mock).mockReturnValue(["unknown"]);

            await expect(generateText("prompt")).rejects.toThrow(/All AI providers failed/);
        });
    });

    describe("generateEmbedding", () => {
        const mockFetch = fetchWithTimeout as jest.Mock;
        const mockGetSecret = require("@/lib/services/secretManagerService").getSecret as jest.Mock;

        beforeEach(() => {
            mockGetSecret.mockResolvedValue("api-key");
        });

        it("returns embedding vector on success", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    embedding: { values: [0.1, 0.2, 0.3] }
                })
            });

            const vec = await generateEmbedding("text");
            expect(vec).toEqual([0.1, 0.2, 0.3]);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("key=api-key"),
                expect.objectContaining({ method: "POST" })
            );
        });

        it("throws if API key missing", async () => {
            mockGetSecret.mockResolvedValue(null);
            await expect(generateEmbedding("text")).rejects.toThrow("Gemini API key missing");
        });

        it("throws if fetch fails", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => "Internal Server Error"
            });
            await expect(generateEmbedding("text")).rejects.toThrow("Embedding failed (500)");
        });

        it("throws if response structure is invalid", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({}) // Missing embedding.values
            });
            await expect(generateEmbedding("text")).rejects.toThrow("Invalid embedding response structure");
        });
    });
});
