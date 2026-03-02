/**
 * Resume Extraction Quality KPI Test
 *
 * This test is the PRIMARY quality canary for the resume EXTRACTION pipeline.
 * It runs the real extractors against the 60-case gold evaluation dataset and
 * asserts that field-level extraction rates meet launch thresholds.
 *
 * DESIGN NOTE: evaluateLaunchGate() is designed for AI-GENERATED resumes (it
 * validates a fully structured {"name","email","summary","experience":[{company,
 * title,description}],...} object). Extractors output raw field values, not
 * polished AI resume JSON. We therefore test extraction quality DIRECTLY with
 * calibrated thresholds, then separately use evaluateFactualAlignment() to
 * confirm extracted values are grounded in the source text.
 *
 * EXTRACTION KPI THRESHOLDS:
 *   - nameExtractionRate     >= 85%   (of cases yield a non-empty name)
 *   - emailExtractionRate    >= 90%   (of cases yield a valid email)
 *   - skillsExtractionRate   >= 90%   (of cases yield ≥1 skill)
 *   - expOrEduRate           >= 75%   (of cases yield experience OR education)
 *   - avgFieldsExtracted     >= 4     (fields per case on average)
 *   - factualAlignmentScore  >= 80%   (extracted values grounded in source)
 *
 * Any extractor change that degrades these metrics causes this test to fail.
 */

import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import { evaluateFactualAlignment } from "@/lib/services/resumeGenerationQuality";
import type { EvidenceMessage } from "@/lib/services/resumeGenerationQuality";
import type { ResumeDataRequirements } from "@/lib/services/conversationManager";
import {
  GOLD_DATASET,
  GOLD_DATASET_STATS,
  type GoldCase,
} from "../data/evaluationGoldDataset";

// ---------------------------------------------------------------------------
// Extraction result shape
// ---------------------------------------------------------------------------

interface ExtractionQualityResult {
  id: string;
  category: GoldCase["category"];
  data: Partial<ResumeDataRequirements>;
  extractedFields: string[];
  evidenceMessages: EvidenceMessage[];
  reviewerScore: number;
  factualAlignmentScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runChatExtraction(goldCase: GoldCase): ExtractionQualityResult {
  const messages = goldCase.messages ?? [];
  const result = ResumeDataExtractor.extractFromConversation(messages);
  const evidenceMessages: EvidenceMessage[] = messages;

  const factual = evaluateFactualAlignment(
    result.data as Record<string, unknown>,
    evidenceMessages,
  );

  return {
    id: goldCase.id,
    category: goldCase.category,
    data: result.data,
    extractedFields: result.extractedFields,
    evidenceMessages,
    reviewerScore: goldCase.reviewerScore,
    factualAlignmentScore: factual.score * 100,
  };
}

function runPasteExtraction(goldCase: GoldCase): ExtractionQualityResult {
  const text = goldCase.pasteText ?? "";
  const { draft } = ResumeIntakeNormalizer.normalize({
    sources: [{ channel: "paste", text }],
  });

  const evidenceMessages: EvidenceMessage[] = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ content: l, isUser: true }));

  const factual = evaluateFactualAlignment(
    draft.extractedData as Record<string, unknown>,
    evidenceMessages,
  );

  return {
    id: goldCase.id,
    category: goldCase.category,
    data: draft.extractedData,
    extractedFields: draft.extractedFields,
    evidenceMessages,
    reviewerScore: goldCase.reviewerScore,
    factualAlignmentScore: factual.score * 100,
  };
}

function runExtraction(goldCase: GoldCase): ExtractionQualityResult {
  return goldCase.category === "paste"
    ? runPasteExtraction(goldCase)
    : runChatExtraction(goldCase);
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidEmail(value: unknown): boolean {
  return (
    hasNonEmptyString(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value as string).trim())
  );
}

function hasSkills(data: Partial<ResumeDataRequirements>): boolean {
  return Array.isArray(data.skills) && data.skills.length > 0;
}

function hasExperienceOrEducation(
  data: Partial<ResumeDataRequirements>,
): boolean {
  const hasExp = Array.isArray(data.experience) && data.experience.length > 0;
  const hasEdu = Array.isArray(data.education) && data.education.length > 0;
  return hasExp || hasEdu;
}

function percent(count: number, total: number): number {
  return Math.round((count / total) * 100 * 10) / 10; // round to 1 decimal
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Resume Extraction KPI — Gold Dataset", () => {
  let results: ExtractionQualityResult[];

  beforeAll(() => {
    results = GOLD_DATASET.map(runExtraction);
  });

  // -------------------------------------------------------------------------
  // Dataset sanity checks
  // -------------------------------------------------------------------------

  describe("Dataset integrity", () => {
    it("has the expected number of cases", () => {
      expect(GOLD_DATASET.length).toBe(200);
    });

    it("covers all three input channels", () => {
      expect(GOLD_DATASET_STATS.chat).toBeGreaterThanOrEqual(80);
      expect(GOLD_DATASET_STATS.paste).toBeGreaterThanOrEqual(60);
      expect(GOLD_DATASET_STATS.pdf).toBeGreaterThanOrEqual(60);
    });

    it("has no duplicate case IDs", () => {
      const ids = GOLD_DATASET.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("every case has a reviewer score in the valid range (3.5–5.0)", () => {
      for (const c of GOLD_DATASET) {
        expect(c.reviewerScore).toBeGreaterThanOrEqual(3.5);
        expect(c.reviewerScore).toBeLessThanOrEqual(5.0);
      }
    });

    it("every chat/pdf case has at least 1 message", () => {
      for (const c of GOLD_DATASET.filter((g) => g.category !== "paste")) {
        expect(c.messages?.length ?? 0).toBeGreaterThanOrEqual(1);
      }
    });

    it("every paste case has non-empty pasteText", () => {
      for (const c of GOLD_DATASET.filter((g) => g.category === "paste")) {
        expect(c.pasteText?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Name extraction rate
  // -------------------------------------------------------------------------

  describe("KPI: Name extraction rate", () => {
    it("extracts a non-empty name from ≥85% of all cases", () => {
      const withName = results.filter((r) => hasNonEmptyString(r.data.name));
      const rate = percent(withName.length, results.length);
      if (rate < 85) {
        const missing = results
          .filter((r) => !hasNonEmptyString(r.data.name))
          .map((r) => r.id);
        console.error(`Name extraction rate ${rate}%. Missing in:`, missing);
      }
      expect(rate).toBeGreaterThanOrEqual(85);
    });

    it("extracts name from ≥90% of chat cases", () => {
      const chat = results.filter((r) => r.category === "chat");
      const withName = chat.filter((r) => hasNonEmptyString(r.data.name));
      const rate = percent(withName.length, chat.length);
      expect(rate).toBeGreaterThanOrEqual(90);
    });

    it("extracts name from ≥80% of paste cases", () => {
      // Paste is harder due to varied formatting; 80% threshold
      const paste = results.filter((r) => r.category === "paste");
      const withName = paste.filter((r) => hasNonEmptyString(r.data.name));
      const rate = percent(withName.length, paste.length);
      expect(rate).toBeGreaterThanOrEqual(80);
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Email extraction rate
  // -------------------------------------------------------------------------

  describe("KPI: Email extraction rate", () => {
    it("extracts a valid email from ≥90% of all cases", () => {
      const withEmail = results.filter((r) => hasValidEmail(r.data.email));
      const rate = percent(withEmail.length, results.length);
      if (rate < 90) {
        const missing = results
          .filter((r) => !hasValidEmail(r.data.email))
          .map((r) => r.id);
        console.error(`Email extraction rate ${rate}%. Missing in:`, missing);
      }
      expect(rate).toBeGreaterThanOrEqual(90);
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Skills extraction rate
  // -------------------------------------------------------------------------

  describe("KPI: Skills extraction rate", () => {
    it("extracts ≥1 skill from ≥90% of all cases", () => {
      const withSkills = results.filter((r) => hasSkills(r.data));
      const rate = percent(withSkills.length, results.length);
      if (rate < 90) {
        const missing = results
          .filter((r) => !hasSkills(r.data))
          .map((r) => r.id);
        console.error(`Skills extraction rate ${rate}%. Missing in:`, missing);
      }
      expect(rate).toBeGreaterThanOrEqual(90);
    });

    it("extracts ≥3 skills from ≥80% of cases where user listed skills", () => {
      const casesWithSkillsList = results.filter(
        (r) => Array.isArray(r.data.skills) && r.data.skills.length >= 1,
      );
      const withThreeOrMore = casesWithSkillsList.filter(
        (r) => (r.data.skills?.length ?? 0) >= 3,
      );
      const rate = percent(withThreeOrMore.length, casesWithSkillsList.length);
      expect(rate).toBeGreaterThanOrEqual(80);
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Experience / education extraction rate
  // -------------------------------------------------------------------------

  describe("KPI: Experience or education extraction rate", () => {
    it("extracts experience OR education in ≥75% of all cases", () => {
      const withExpOrEdu = results.filter((r) =>
        hasExperienceOrEducation(r.data),
      );
      const rate = percent(withExpOrEdu.length, results.length);
      if (rate < 75) {
        const missing = results
          .filter((r) => !hasExperienceOrEducation(r.data))
          .map((r) => r.id);
        console.error(`Exp/edu extraction rate ${rate}%. Missing in:`, missing);
      }
      expect(rate).toBeGreaterThanOrEqual(75);
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Average fields extracted
  // -------------------------------------------------------------------------

  describe("KPI: Average fields extracted per case", () => {
    it("extracts an average of ≥4 fields per case", () => {
      const avgFields =
        results.reduce((sum, r) => sum + r.extractedFields.length, 0) /
        results.length;
      if (avgFields < 4) {
        console.error(`Average fields extracted: ${avgFields.toFixed(1)}`);
      }
      expect(avgFields).toBeGreaterThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // KPI: Factual alignment score
  // -------------------------------------------------------------------------

  describe("KPI: Factual alignment of extracted data", () => {
    it("average factual alignment ≥80% across all cases", () => {
      const average =
        results.reduce((sum, r) => sum + r.factualAlignmentScore, 0) /
        results.length;
      if (average < 80) {
        console.error(
          `Average factual alignment ${average.toFixed(1)}% below 80%`,
        );
      }
      expect(average).toBeGreaterThanOrEqual(80);
    });

    it("no more than 10% of cases have factual alignment below 50%", () => {
      const veryLow = results.filter((r) => r.factualAlignmentScore < 50);
      const rate = percent(veryLow.length, results.length);
      expect(rate).toBeLessThanOrEqual(10);
    });
  });

  // -------------------------------------------------------------------------
  // Regression: bugs fixed in February 2025
  // -------------------------------------------------------------------------

  describe("Regression: bugs fixed in Feb 2025", () => {
    it("[BUG-1] 'I am based in Bangalore' is NOT extracted as name (chat-ng-002)", () => {
      const r = results.find((c) => c.id === "chat-ng-002");
      expect(r).toBeDefined();
      const name = r!.data.name ?? "";
      expect(name).not.toMatch(/based/i);
      expect(name).not.toMatch(/bangalore/i);
    });

    it("[BUG-2] Paste name 'John Smith' is extracted correctly from paste-001", () => {
      const r = results.find((c) => c.id === "paste-001");
      expect(r).toBeDefined();
      expect(r!.data.name?.toLowerCase()).toContain("john smith");
    });

    it("[BUG-3] 'Professional Summary' heading is NOT extracted as name (paste-001)", () => {
      const r = results.find((c) => c.id === "paste-001");
      expect(r).toBeDefined();
      expect(r!.data.name?.toLowerCase()).not.toBe("professional summary");
    });

    it("[BUG-4] Multiple skills extracted from multi-sentence skill descriptions (chat-cc-003)", () => {
      const r = results.find((c) => c.id === "chat-cc-003");
      expect(r).toBeDefined();
      const skills = r!.data.skills ?? [];
      expect(skills.length).toBeGreaterThanOrEqual(3);
      expect(skills.some((s: string) => /react/i.test(s))).toBe(true);
      expect(skills.some((s: string) => /typescript/i.test(s))).toBe(true);
    });

    it("[BUG-5] Solo-founder role phrase NOT mistaken for name (chat-cc-003)", () => {
      const r = results.find((c) => c.id === "chat-cc-003");
      expect(r).toBeDefined();
      const name = r!.data.name ?? "";
      expect(name.toLowerCase()).not.toContain("founder");
      expect(name.toLowerCase()).not.toContain("i am");
      expect(name.toLowerCase()).not.toContain("agency");
    });
  });

  // -------------------------------------------------------------------------
  // Spot-check: complete input cases should yield a richer extraction
  // -------------------------------------------------------------------------

  describe("Spot-checks: high-quality input cases yield complete extraction", () => {
    const highQualityIds = [
      "chat-ms-001", // David Kim — 4.9 reviewer
      "chat-ms-004", // Preethi Nair — data scientist, 4.8
      "paste-001", // John Smith — clean 1-page, 4.8
      "paste-002", // Priya Nambiar — data scientist, 4.8
    ];

    for (const id of highQualityIds) {
      it(`case ${id} has name, email, and skills extracted`, () => {
        const r = results.find((c) => c.id === id);
        expect(r).toBeDefined();
        expect(hasNonEmptyString(r!.data.name)).toBe(true);
        expect(hasValidEmail(r!.data.email)).toBe(true);
        expect(hasSkills(r!.data)).toBe(true);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Summary printout (informational — does not assert)
  // -------------------------------------------------------------------------

  describe("Summary metrics printout", () => {
    it("prints extraction quality summary to console", () => {
      const total = results.length;
      const nameRate = percent(
        results.filter((r) => hasNonEmptyString(r.data.name)).length,
        total,
      );
      const emailRate = percent(
        results.filter((r) => hasValidEmail(r.data.email)).length,
        total,
      );
      const skillsRate = percent(
        results.filter((r) => hasSkills(r.data)).length,
        total,
      );
      const expEduRate = percent(
        results.filter((r) => hasExperienceOrEducation(r.data)).length,
        total,
      );
      const avgFA =
        results.reduce((sum, r) => sum + r.factualAlignmentScore, 0) / total;
      const avgFields =
        results.reduce((sum, r) => sum + r.extractedFields.length, 0) / total;

      console.log("\n=== EXTRACTION QUALITY SUMMARY ===");
      console.table({
        totalCases: total,
        nameExtractionRate: `${nameRate}%`,
        emailExtractionRate: `${emailRate}%`,
        skillsExtractionRate: `${skillsRate}%`,
        expOrEduRate: `${expEduRate}%`,
        avgFactualAlignment: `${avgFA.toFixed(1)}%`,
        avgFieldsExtracted: avgFields.toFixed(1),
      });

      expect(true).toBe(true); // always passes — just for the printout
    });
  });
});

// ---------------------------------------------------------------------------
// AI Extraction Path Validation (B7)
// ---------------------------------------------------------------------------

describe("Resume AI Extraction — Schema Validation", () => {
  it("ResumeExtractionSchema validates a complete extraction result", () => {
    const {
      ResumeExtractionSchema,
    } = require("@/lib/schemas/resumeExtractionSchema");

    const validData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1-555-0100",
      location: "San Francisco, CA",
      summary: "Senior Software Engineer with 10 years of experience.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "TechCorp",
          duration: "2020 - Present",
          description: "Built scalable systems.",
          achievements: ["Led team of 5", "Reduced latency by 40%"],
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          institution: "Stanford University",
          year: "2014",
          major: "Computer Science",
        },
      ],
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    };

    const result = ResumeExtractionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("ResumeExtractionSchema accepts partial data (all fields optional)", () => {
    const {
      ResumeExtractionSchema,
    } = require("@/lib/schemas/resumeExtractionSchema");

    const partial = { name: "Jane Doe", skills: ["Python"] };
    const result = ResumeExtractionSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("ResumeExtractionSchema accepts empty object", () => {
    const {
      ResumeExtractionSchema,
    } = require("@/lib/schemas/resumeExtractionSchema");

    const result = ResumeExtractionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("ResumeExtractionSchema converts to Gemini JSON Schema", () => {
    const {
      ResumeExtractionSchema,
    } = require("@/lib/schemas/resumeExtractionSchema");
    const { zodToGeminiSchema } = require("@/lib/utils/zodToGeminiSchema");

    const geminiSchema = zodToGeminiSchema(ResumeExtractionSchema);
    expect(geminiSchema.type).toBe("OBJECT");
    expect(geminiSchema.properties).toBeDefined();
    // All fields should be present in properties
    expect(geminiSchema.properties!.name).toBeDefined();
    expect(geminiSchema.properties!.email).toBeDefined();
    expect(geminiSchema.properties!.experience).toBeDefined();
    expect(geminiSchema.properties!.skills).toBeDefined();
    // All fields should be optional (not in required list)
    expect(geminiSchema.required ?? []).not.toContain("name");
    expect(geminiSchema.required ?? []).not.toContain("email");
  });

  it("extractWithStructuredOutput returns fallback when skipAI=true", async () => {
    const {
      extractWithStructuredOutput,
    } = require("@/lib/services/aiExtractionService");

    const result = await extractWithStructuredOutput(
      "John Doe\njohn@example.com\nSoftware Engineer",
      { skipAI: true },
    );

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.data).toBeNull();
  });

  it("extractWithStructuredOutput returns fallback for very short text", async () => {
    const {
      extractWithStructuredOutput,
    } = require("@/lib/services/aiExtractionService");

    const result = await extractWithStructuredOutput("Hi", {});

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.error).toContain("too short");
  });

  it("ResumeDataExtractor.extractFromConversationWithAI falls back to regex when skipAI", async () => {
    const messages = [
      { content: "My name is John Doe, email john@test.com", isUser: true },
      { content: "Great, what skills do you have?", isUser: false },
      { content: "I know TypeScript, React, and Node.js", isUser: true },
    ];

    const result = await ResumeDataExtractor.extractFromConversationWithAI(
      messages,
      {
        skipAI: true,
      },
    );

    expect(result.method).toBe("regex");
    expect(result.data).toBeDefined();
  });
});
