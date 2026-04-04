/**
 * Tests for RAG Vector Store
 */

import {
  setChunks,
  getChunks,
  hasValidChunks,
  clearChunks,
  clearAll,
  getStoreStats,
  searchSimilar,
  searchAllResumes,
  cosineSimilarity,
} from "../rag/vectorStore";
import type { EmbeddedChunk } from "../rag/types";

// ─── Helpers ────────────────────────────────────────────────────────

function makeChunk(
  id: string,
  text: string,
  embedding: number[],
): EmbeddedChunk {
  return {
    id,
    text,
    section: "experience",
    index: 0,
    wordCount: text.split(/\s+/).length,
    metadata: {},
    embedding,
  };
}

// Normalized unit vectors for predictable cosine similarity
const vec1 = [1, 0, 0]; // points along x-axis
const vec2 = [0, 1, 0]; // points along y-axis (orthogonal to vec1)
const vec3 = [0.7071, 0.7071, 0]; // 45° between vec1 and vec2

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  clearAll();
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0);
  });

  it("returns ~0.707 for 45-degree angle", () => {
    expect(cosineSimilarity(vec1, vec3)).toBeCloseTo(0.7071, 3);
  });

  it("handles zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("handles empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("handles mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("setChunks / getChunks", () => {
  it("stores and retrieves chunks", () => {
    const chunks = [makeChunk("c1", "experience at Google", vec1)];
    setChunks("resume-1", chunks);

    const retrieved = getChunks("resume-1");
    expect(retrieved).toHaveLength(1);
    expect(retrieved![0].id).toBe("c1");
  });

  it("returns null for unknown resume", () => {
    expect(getChunks("nonexistent")).toBeNull();
  });

  it("respects TTL — expired entries return null", () => {
    const chunks = [makeChunk("c1", "test", vec1)];
    setChunks("resume-1", chunks, 1); // 1ms TTL

    // Wait for expiration
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait 5ms
    }

    expect(getChunks("resume-1")).toBeNull();
  });
});

describe("hasValidChunks", () => {
  it("returns true for stored chunks", () => {
    setChunks("resume-1", [makeChunk("c1", "test", vec1)]);
    expect(hasValidChunks("resume-1")).toBe(true);
  });

  it("returns false for missing chunks", () => {
    expect(hasValidChunks("nonexistent")).toBe(false);
  });
});

describe("clearChunks", () => {
  it("removes chunks for a specific resume", () => {
    setChunks("resume-1", [makeChunk("c1", "test", vec1)]);
    setChunks("resume-2", [makeChunk("c2", "test", vec1)]);

    clearChunks("resume-1");
    expect(hasValidChunks("resume-1")).toBe(false);
    expect(hasValidChunks("resume-2")).toBe(true);
  });
});

describe("getStoreStats", () => {
  it("reports correct counts", () => {
    setChunks("r1", [makeChunk("c1", "a", vec1), makeChunk("c2", "b", vec2)]);
    setChunks("r2", [makeChunk("c3", "c", vec3)]);

    const stats = getStoreStats();
    expect(stats.resumeCount).toBe(2);
    expect(stats.totalChunks).toBe(3);
  });
});

describe("searchSimilar", () => {
  it("returns chunks sorted by similarity (highest first)", () => {
    const chunks = [
      makeChunk("exact", "exact match", vec1),
      makeChunk("partial", "partial match", vec3), // ~0.707 similarity to vec1
      makeChunk("orthogonal", "no match", vec2), // 0 similarity to vec1
    ];
    setChunks("resume-1", chunks);

    const results = searchSimilar("resume-1", vec1, 5, 0.0);

    expect(results.length).toBe(3);
    expect(results[0].chunk.id).toBe("exact");
    expect(results[0].score).toBeCloseTo(1.0);
    expect(results[1].chunk.id).toBe("partial");
    expect(results[1].score).toBeCloseTo(0.7071, 3);
  });

  it("filters by threshold", () => {
    const chunks = [
      makeChunk("high", "high similarity", vec1),
      makeChunk("low", "low similarity", vec2),
    ];
    setChunks("resume-1", chunks);

    const results = searchSimilar("resume-1", vec1, 5, 0.5);
    expect(results.length).toBe(1);
    expect(results[0].chunk.id).toBe("high");
  });

  it("respects topK limit", () => {
    const chunks = Array.from({ length: 10 }, (_, i) =>
      makeChunk(`c${i}`, `chunk ${i}`, vec1),
    );
    setChunks("resume-1", chunks);

    const results = searchSimilar("resume-1", vec1, 3, 0);
    expect(results.length).toBe(3);
  });

  it("returns empty for non-indexed resume", () => {
    expect(searchSimilar("nonexistent", vec1)).toEqual([]);
  });

  it("strips embeddings from results", () => {
    setChunks("resume-1", [makeChunk("c1", "test", vec1)]);
    const results = searchSimilar("resume-1", vec1, 5, 0);

    expect(results[0].chunk).not.toHaveProperty("embedding");
  });
});

describe("searchAllResumes", () => {
  it("searches across multiple resumes", () => {
    setChunks("r1", [makeChunk("r1c1", "eng at Google", vec1)]);
    setChunks("r2", [makeChunk("r2c1", "eng at Meta", vec3)]);

    const results = searchAllResumes(vec1, 10, 0.0);
    expect(results.length).toBe(2);
    expect(results[0].resumeId).toBe("r1");
    expect(results[1].resumeId).toBe("r2");
  });
});
