/**
 * Resume Generation Quality KPI Gate
 *
 * Validates the full generation quality pipeline against synthetic golden
 * AI responses. Does NOT call real AI — all responses are hand-crafted.
 *
 * KPI Thresholds:
 *   1. Schema pass rate (clean inputs)       ≥ 95%
 *   2. Schema reject rate (malformed inputs)  = 100%
 *   3. Hallucination detection rate           ≥ 90%
 *   4. False-positive rate on clean resumes   ≤ 10%
 *   5. Factual alignment (clean) average      ≥ 90%
 *   6. Completeness (clean) average           ≥ 85%
 */

import {
  GOLDEN_AI_RESPONSES,
  GOLDEN_STATS,
  type GoldenAIResponse,
} from "@/__tests__/lib/data/generationGoldResponses";
import { AIResumeResponseSchema } from "@/lib/schemas/aiResumeSchema";
import {
  evaluateFactualAlignment,
  validateStructuredResumeContract,
} from "@/lib/services/resumeGenerationQuality";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tryParseJSON(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isSchemaValid(raw: string): boolean {
  const parsed = tryParseJSON(raw);
  if (!parsed) return false;
  return AIResumeResponseSchema.safeParse(parsed).success;
}

/** Returns true when at least one unsupported metric claim is found. */
function detectHallucination(entry: GoldenAIResponse): boolean {
  const parsed = tryParseJSON(entry.response);
  if (!parsed) return false; // can't evaluate hallucination on unparseable

  const result = evaluateFactualAlignment(parsed, entry.evidenceMessages);
  return result.unsupportedClaims.length > 0;
}

function computeFactualAlignmentScore(entry: GoldenAIResponse): number {
  const parsed = tryParseJSON(entry.response);
  if (!parsed) return 0;
  const result = evaluateFactualAlignment(parsed, entry.evidenceMessages);
  return result.score;
}

/**
 * Completeness: percentage of core resume fields that are populated.
 * Core fields: name (from contact email proxy), summary, experience,
 * education, skills, contact.
 */
function computeCompleteness(raw: string): number {
  const parsed = tryParseJSON(raw);
  if (!parsed) return 0;

  const fields = [
    typeof parsed.summary === "string" && parsed.summary.length > 0,
    Array.isArray(parsed.skills) && parsed.skills.length > 0,
    Array.isArray(parsed.experience) && parsed.experience.length > 0,
    Array.isArray(parsed.education) && parsed.education.length > 0,
    parsed.contact != null,
    typeof parsed.title === "string" && parsed.title.length > 0,
  ];

  return fields.filter(Boolean).length / fields.length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Resume Generation Quality KPI Gate", () => {
  const clean = GOLDEN_AI_RESPONSES.filter((e) => e.category === "clean");
  const hallucinated = GOLDEN_AI_RESPONSES.filter(
    (e) => e.category === "hallucinated",
  );
  const malformed = GOLDEN_AI_RESPONSES.filter(
    (e) => e.category === "malformed",
  );

  // =========================================================================
  // SANITY — Dataset metadata
  // =========================================================================

  describe("Golden dataset sanity", () => {
    it("has the expected total count", () => {
      expect(GOLDEN_AI_RESPONSES.length).toBe(GOLDEN_STATS.total);
      expect(GOLDEN_STATS.total).toBe(30);
    });

    it("has 15 clean, 10 hallucinated, 5 malformed", () => {
      expect(clean.length).toBe(15);
      expect(hallucinated.length).toBe(10);
      expect(malformed.length).toBe(5);
    });

    it("all IDs are unique", () => {
      const ids = GOLDEN_AI_RESPONSES.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // =========================================================================
  // KPI 1: Schema pass rate on CLEAN inputs — ≥ 95%
  // =========================================================================

  describe("KPI 1: Schema pass rate (clean inputs ≥ 95%)", () => {
    const results = clean.map((e) => ({
      id: e.id,
      valid: isSchemaValid(e.response),
    }));

    const passCount = results.filter((r) => r.valid).length;
    const passRate = passCount / clean.length;

    it(`schema pass rate is ≥ 95% (actual: ${(passRate * 100).toFixed(1)}%)`, () => {
      expect(passRate).toBeGreaterThanOrEqual(0.95);
    });

    // Individual tests for debuggability
    it.each(clean.map((e) => [e.id, e]))(
      "clean-%s passes schema",
      (_id, entry) => {
        expect(isSchemaValid((entry as GoldenAIResponse).response)).toBe(true);
      },
    );
  });

  // =========================================================================
  // KPI 2: Schema reject rate on MALFORMED inputs = 100%
  // =========================================================================

  describe("KPI 2: Schema reject rate (malformed = 100%)", () => {
    const results = malformed.map((e) => ({
      id: e.id,
      valid: isSchemaValid(e.response),
    }));

    const rejectCount = results.filter((r) => !r.valid).length;
    const rejectRate = rejectCount / malformed.length;

    it(`schema reject rate is 100% (actual: ${(rejectRate * 100).toFixed(1)}%)`, () => {
      expect(rejectRate).toBe(1);
    });

    it.each(malformed.map((e) => [e.id, e]))(
      "malformed-%s is rejected",
      (_id, entry) => {
        expect(isSchemaValid((entry as GoldenAIResponse).response)).toBe(false);
      },
    );
  });

  // =========================================================================
  // KPI 3: Hallucination detection rate — ≥ 90%
  // =========================================================================

  describe("KPI 3: Hallucination detection rate (≥ 90%)", () => {
    const results = hallucinated.map((e) => ({
      id: e.id,
      detected: detectHallucination(e),
    }));

    const detectedCount = results.filter((r) => r.detected).length;
    const detectionRate = detectedCount / hallucinated.length;

    it(`hallucination detection rate ≥ 90% (actual: ${(detectionRate * 100).toFixed(1)}%)`, () => {
      expect(detectionRate).toBeGreaterThanOrEqual(0.9);
    });

    it.each(hallucinated.map((e) => [e.id, e]))(
      "hallucinated-%s is detected",
      (_id, entry) => {
        expect(detectHallucination(entry as GoldenAIResponse)).toBe(true);
      },
    );
  });

  // =========================================================================
  // KPI 4: False positive rate on clean resumes — ≤ 10%
  // =========================================================================

  describe("KPI 4: False positive rate (clean ≤ 10%)", () => {
    const results = clean.map((e) => ({
      id: e.id,
      flaggedAsHallucinated: detectHallucination(e),
    }));

    const falsePositiveCount = results.filter(
      (r) => r.flaggedAsHallucinated,
    ).length;
    const fpRate = falsePositiveCount / clean.length;

    it(`false positive rate ≤ 10% (actual: ${(fpRate * 100).toFixed(1)}%)`, () => {
      expect(fpRate).toBeLessThanOrEqual(0.1);
    });
  });

  // =========================================================================
  // KPI 5: Factual alignment average (clean) — ≥ 90%
  // =========================================================================

  describe("KPI 5: Factual alignment (clean average ≥ 90%)", () => {
    const scores = clean.map((e) => computeFactualAlignmentScore(e));
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    it(`average factual alignment ≥ 0.90 (actual: ${avgScore.toFixed(2)})`, () => {
      expect(avgScore).toBeGreaterThanOrEqual(0.9);
    });
  });

  // =========================================================================
  // KPI 6: Completeness average (clean) — ≥ 85%
  // =========================================================================

  describe("KPI 6: Completeness (clean average ≥ 85%)", () => {
    const scores = clean.map((e) => computeCompleteness(e.response));
    const avgCompleteness =
      scores.reduce((sum, s) => sum + s, 0) / scores.length;

    it(`average completeness ≥ 0.85 (actual: ${avgCompleteness.toFixed(2)})`, () => {
      expect(avgCompleteness).toBeGreaterThanOrEqual(0.85);
    });
  });

  // =========================================================================
  // Contract validation — clean inputs pass, malformed fail
  // =========================================================================

  describe("Contract validation on clean inputs", () => {
    it("all clean inputs pass contract validation (non-strict)", () => {
      for (const entry of clean) {
        const parsed = tryParseJSON(entry.response);
        expect(parsed).not.toBeNull();
        const errors = validateStructuredResumeContract(parsed!);
        expect(errors).toEqual([]);
      }
    });
  });

  // =========================================================================
  // Summary report (informational — always passes)
  // =========================================================================

  describe("Generation Quality Summary Report", () => {
    it("prints summary", () => {
      const schemaPassClean =
        clean.filter((e) => isSchemaValid(e.response)).length / clean.length;
      const schemaRejectMalformed =
        malformed.filter((e) => !isSchemaValid(e.response)).length /
        malformed.length;
      const halluDetect =
        hallucinated.filter((e) => detectHallucination(e)).length /
        hallucinated.length;
      const falsePositive =
        clean.filter((e) => detectHallucination(e)).length / clean.length;
      const avgAlignment =
        clean.reduce((s, e) => s + computeFactualAlignmentScore(e), 0) /
        clean.length;
      const avgComplete =
        clean.reduce((s, e) => s + computeCompleteness(e.response), 0) /
        clean.length;

      const report = {
        "Schema Pass (clean)": `${(schemaPassClean * 100).toFixed(1)}%`,
        "Schema Reject (malformed)": `${(schemaRejectMalformed * 100).toFixed(1)}%`,
        "Hallucination Detection": `${(halluDetect * 100).toFixed(1)}%`,
        "False Positive Rate": `${(falsePositive * 100).toFixed(1)}%`,
        "Factual Alignment (avg)": `${(avgAlignment * 100).toFixed(1)}%`,
        "Completeness (avg)": `${(avgComplete * 100).toFixed(1)}%`,
      };

      console.table(report);
      // Minimum quality gates — these values must all be ≥ the floor to pass.
      expect(schemaPassClean).toBeGreaterThanOrEqual(0);
      expect(schemaRejectMalformed).toBeGreaterThanOrEqual(0);
      expect(halluDetect).toBeGreaterThanOrEqual(0);
    });
  });
});
