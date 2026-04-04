/**
 * Tests for RAG Orchestrator (ragService.ts)
 *
 * Tests the full pipeline:
 *   retrieveRelevantChunks → responseCache → generateText → evaluateRAGResponse → retry
 *
 * Both generateEmbedding and generateText are mocked so no real API calls
 * are made. The vector store is pre-seeded with deterministic embeddings.
 */

import { queryWithRAG, preIndexResume } from "../rag/ragService";
import { clearAll, setChunks } from "../rag/vectorStore";
import { clearResponseCache } from "../rag/responseCache";
import type { EmbeddedChunk, RetrievalResult } from "../rag/types";
import type { ResumeProfile } from "@/types";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockGenerateText = jest.fn();
const mockGenerateEmbedding = jest.fn();
const mockIndexResume = jest.fn();

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  generateEmbedding: (...args: unknown[]) => mockGenerateEmbedding(...args),
}));

// Mock retrievalService so we can control chunk retrieval in orchestrator tests
const mockRetrieveRelevantChunks = jest.fn();
jest.mock("../rag/retrievalService", () => ({
  retrieveRelevantChunks: (...args: unknown[]) =>
    mockRetrieveRelevantChunks(...args),
  buildContextFromChunks: jest.requireActual("../rag/retrievalService")
    .buildContextFromChunks,
  indexResume: (...args: unknown[]) => mockIndexResume(...args),
}));

// ─── Fixtures ───────────────────────────────────────────────────────

const mockProfile: ResumeProfile = {
  versionId: "v1",
  title: "Senior Engineer",
  summary: "8 years in full-stack development.",
  skills: [{ name: "TypeScript", level: "Expert", visibility: "public" }],
  experience: [
    {
      company: "Acme Corp",
      role: "Lead Engineer",
      startDate: "2020-01",
      description:
        "Led team building analytics platform with React and Node.js.",
      visibility: "public",
    },
  ],
  education: [],
  projects: [],
  contact: { email: { value: "test@example.com", visibility: "public" } },
  generatedText: { draft: "", polished: "", lastGeneratedAt: "" },
  slug: "test-slug",
  lastUpdatedAt: "2024-01-01",
};

const mockChunk: RetrievalResult = {
  chunk: {
    id: "r1_experience_0",
    text: "Role: Lead Engineer\nCompany: Acme Corp\nDescription: Led team building analytics platform with React and Node.js.",
    section: "experience" as const,
    index: 0,
    wordCount: 18,
    metadata: { company: "Acme Corp", role: "Lead Engineer" },
  },
  score: 0.85,
};

// ─── Test setup ─────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  clearAll();
  clearResponseCache();

  // Default mock: retrieval returns one relevant chunk
  mockRetrieveRelevantChunks.mockResolvedValue([mockChunk]);

  // Default mock: LLM returns a high-quality grounded answer
  mockGenerateText.mockResolvedValue({
    text: "The candidate led a team at Acme Corp building analytics platform with React and Node.js from January 2020.",
    model: "gemini-pro",
    provider: "gemini",
    usage: { promptTokens: 200, completionTokens: 30, totalTokens: 230 },
  });

  // Default mock: embedding returns a simple unit vector
  mockGenerateEmbedding.mockResolvedValue(new Array(768).fill(0.1));
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("queryWithRAG — happy path", () => {
  it("returns an answer with source chunks and metadata", async () => {
    const result = await queryWithRAG(
      mockProfile,
      {
        query: "What experience does this person have?",
        resumeId: "r1",
        userId: "user-1",
      },
      { scoreThreshold: 0 }, // evaluation not under test here
    );

    expect(result.answer).toBeTruthy();
    expect(result.answer).toContain("Acme Corp");
    expect(result.sourceChunks).toHaveLength(1);
    expect(result.cached).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.model).toBe("gemini-pro");
    expect(result.provider).toBe("gemini");
  });

  it("calls generateText with a prompt containing the chunk context", async () => {
    await queryWithRAG(
      mockProfile,
      { query: "Where did they work?", resumeId: "r1" },
      { scoreThreshold: 0 },
    );

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const [prompt] = mockGenerateText.mock.calls[0];
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("RESUME CONTEXT");
    expect(prompt).toContain("Where did they work?");
  });

  it("respects maxTokens and temperature options", async () => {
    await queryWithRAG(mockProfile, {
      query: "Skills?",
      resumeId: "r1",
      maxTokens: 200,
      temperature: 0.1,
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.any(String),
      200,
      0.1,
      undefined,
      undefined,
    );
  });
});

describe("queryWithRAG — caching", () => {
  it("returns cached=true on second call with same query and chunks", async () => {
    const opts = { query: "Tell me about their experience", resumeId: "r1" };
    const evalOpts = { scoreThreshold: 0 }; // caching behaviour under test, not evaluation

    const first = await queryWithRAG(mockProfile, opts, evalOpts);
    expect(first.cached).toBe(false);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    const second = await queryWithRAG(mockProfile, opts, evalOpts);
    expect(second.cached).toBe(true);
    // generateText should NOT be called again
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("does NOT use cache when chunks differ (resume updated)", async () => {
    const opts = { query: "skills?", resumeId: "r1" };
    const evalOpts = { scoreThreshold: 0 }; // cache-key invalidation under test

    await queryWithRAG(mockProfile, opts, evalOpts);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    // Different chunks returned (simulates resume update re-index)
    mockRetrieveRelevantChunks.mockResolvedValueOnce([
      { ...mockChunk, chunk: { ...mockChunk.chunk, id: "r1_skills_0" } },
    ]);

    await queryWithRAG(mockProfile, opts, evalOpts);
    // Should call LLM again — different cache key
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });
});

describe("queryWithRAG — retry logic", () => {
  it("retries when first response scores below threshold", async () => {
    // First call returns a response with low grounding (no chunk terms)
    mockGenerateText
      .mockResolvedValueOnce({
        text: "I don't have enough context to answer clearly.",
        model: "gemini-pro",
        provider: "gemini",
      })
      .mockResolvedValueOnce({
        text: "The candidate worked at Acme Corp as Lead Engineer, building analytics with React and Node.js.",
        model: "gemini-pro",
        provider: "gemini",
      });

    const result = await queryWithRAG(
      mockProfile,
      { query: "work experience?", resumeId: "r1" },
      { scoreThreshold: 0.5, maxRetries: 1 },
    );

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    // Best answer should be the second (grounded) one
    expect(result.answer).toContain("Acme Corp");
  });

  it("retry prompt contains improved grounding instruction", async () => {
    // Both calls score low — just check the second prompt has retry instruction
    mockGenerateText.mockResolvedValue({
      text: "unclear response",
      model: "gemini-pro",
      provider: "gemini",
    });

    await queryWithRAG(
      mockProfile,
      { query: "background?", resumeId: "r1" },
      { scoreThreshold: 0.99, maxRetries: 1 },
    );

    const secondPrompt = mockGenerateText.mock.calls[1][0];
    expect(secondPrompt).toContain("previous answer was not grounded");
  });

  it("respects maxRetries=0 — no retries", async () => {
    mockGenerateText.mockResolvedValue({
      text: "generic non-specific answer",
      model: "gemini-pro",
      provider: "gemini",
    });

    await queryWithRAG(
      mockProfile,
      { query: "background?", resumeId: "r1" },
      { scoreThreshold: 0.99, maxRetries: 0 },
    );

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});

describe("queryWithRAG — no chunks found", () => {
  it("returns fallback message when retrieval finds nothing", async () => {
    mockRetrieveRelevantChunks.mockResolvedValueOnce([]);

    const result = await queryWithRAG(mockProfile, {
      query: "What is their salary expectation?",
      resumeId: "r1",
    });

    expect(result.answer).toContain("couldn't find relevant information");
    expect(result.sourceChunks).toHaveLength(0);
    expect(result.attempts).toBe(0);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});

describe("queryWithRAG — LLM failure handling", () => {
  it("returns fallback when all LLM calls fail", async () => {
    mockGenerateText.mockRejectedValue(new Error("API timeout"));

    const result = await queryWithRAG(
      mockProfile,
      { query: "experience?", resumeId: "r1" },
      { maxRetries: 0 },
    );

    expect(result.answer).toContain("unable to generate");
    expect(result.qualityScore).toBe(0);
  });
});

describe("preIndexResume", () => {
  it("delegates to indexResume and returns chunk count", async () => {
    mockIndexResume.mockResolvedValue([
      { id: "c1", embedding: [0.1] },
      { id: "c2", embedding: [0.2] },
    ]);

    const result = await preIndexResume(mockProfile, "r1");
    expect(result.chunkCount).toBe(2);
    expect(mockIndexResume).toHaveBeenCalledWith(mockProfile, "r1");
  });
});
