import { ResumeDataRequirements } from "@/lib/services/conversationManager";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { logger } from "@/lib/logger";
import type { AIObservationContext } from "@/lib/services/aiMonitoringService";

export type ResumeIntakeSourceChannel = "chat" | "paste" | "pdf" | "docx";

export interface ResumeIntakeSource {
  channel: ResumeIntakeSourceChannel;
  text: string;
}

export interface NormalizeResumeIntakeInput {
  sources: ResumeIntakeSource[];
}

type ResumeSection =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "other";

export interface NormalizedResumeDraft {
  mergedText: string;
  cleanedText: string;
  sections: Record<ResumeSection, string[]>;
  extractedData: Partial<ResumeDataRequirements>;
  extractedFields: string[];
}

export type EvidenceMap = Record<string, string[]>;

export interface NormalizeResumeIntakeResult {
  draft: NormalizedResumeDraft;
  evidenceMap: EvidenceMap;
  missingCriticalFields: string[];
}

const SECTION_HEADINGS: Array<{ section: ResumeSection; pattern: RegExp }> = [
  {
    section: "contact",
    pattern: /^(contact|personal info|personal information|profile)$/i,
  },
  {
    section: "summary",
    pattern: /^(summary|professional summary|objective|about)$/i,
  },
  {
    section: "experience",
    pattern:
      /^(experience|professional experience|work experience|employment history|work history)$/i,
  },
  {
    section: "education",
    pattern: /^(education|academic background|academic history)$/i,
  },
  {
    section: "skills",
    pattern: /^(skills|technical skills|core skills|technologies)$/i,
  },
  {
    section: "projects",
    pattern: /^(projects|project experience)$/i,
  },
];

const REQUIRED_FIELDS: Array<keyof ResumeDataRequirements> = ["name", "email"];

function isPopulatedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPopulatedArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function mergeAIWithDeterministicBackstop(
  aiData: Partial<ResumeDataRequirements>,
  deterministicData: Partial<ResumeDataRequirements>,
): Partial<ResumeDataRequirements> {
  const merged: Partial<ResumeDataRequirements> = { ...aiData };

  const stringFields: Array<keyof ResumeDataRequirements> = [
    "name",
    "email",
    "phone",
    "location",
    "github",
    "linkedin",
    "twitter",
    "summary",
  ];

  for (const field of stringFields) {
    if (!isPopulatedString(merged[field])) {
      const fallbackValue = deterministicData[field];
      if (isPopulatedString(fallbackValue)) {
        (merged as Record<string, unknown>)[field] = fallbackValue;
      }
    }
  }

  // For skills, education, projects: all-or-nothing fallback.
  const simpleArrayFields: Array<keyof ResumeDataRequirements> = [
    "education",
    "skills",
    "projects",
  ];
  for (const field of simpleArrayFields) {
    if (!isPopulatedArray(merged[field])) {
      const fallbackValue = deterministicData[field];
      if (isPopulatedArray(fallbackValue)) {
        (merged as Record<string, unknown>)[field] = fallbackValue;
      }
    }
  }

  // Deep-merge experience: if AI extracted entries, enrich any entry that is
  // missing description/achievements using a matching deterministic entry.
  // This handles the common case where AI correctly identifies title+company
  // but the deterministic extractor captured more of the bullet-point text.
  if (isPopulatedArray(merged.experience)) {
    const detExp = deterministicData.experience ?? [];
    merged.experience = (
      merged.experience as ResumeDataRequirements["experience"]
    ).map((aiEntry) => {
      if (
        aiEntry.description &&
        aiEntry.description.trim().length > 0 &&
        aiEntry.achievements &&
        aiEntry.achievements.length > 0
      ) {
        // AI entry already has both description and achievements — keep as-is.
        return aiEntry;
      }
      // Look for a deterministic entry with the same title or company.
      const detMatch = detExp.find((det) => {
        const titleMatch =
          aiEntry.title &&
          det.title &&
          det.title.toLowerCase().trim() === aiEntry.title.toLowerCase().trim();
        const companyMatch =
          aiEntry.company &&
          det.company &&
          det.company.toLowerCase().trim() ===
            aiEntry.company.toLowerCase().trim();
        return titleMatch || companyMatch;
      });
      if (!detMatch) return aiEntry;
      return {
        ...aiEntry,
        description:
          aiEntry.description?.trim() || detMatch.description?.trim() || "",
        achievements: aiEntry.achievements?.length
          ? aiEntry.achievements
          : (detMatch.achievements ?? []),
        duration: aiEntry.duration?.trim() || detMatch.duration?.trim() || "",
      };
    });
  } else if (isPopulatedArray(deterministicData.experience)) {
    // AI returned no experience at all — fall back to deterministic.
    merged.experience = deterministicData.experience;
  }

  return merged;
}

function normalizeWhitespace(text: string): string {
  return (
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Preserve structure: convert Unicode dashes/hyphens to ASCII hyphen before stripping
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
      // Normalize curly/smart quotes to straight quotes
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function isLikelyHeaderFooter(
  line: string,
  counts: Map<string, number>,
): boolean {
  const normalizedLine = line.trim().toLowerCase();
  if (!normalizedLine) return false;
  if (/^page\s*\d+(\s*of\s*\d+)?$/.test(normalizedLine)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(normalizedLine)) return true;

  const repetitions = counts.get(normalizedLine) ?? 0;
  if (repetitions < 3) return false;
  if (normalizedLine.length > 80) return false;

  return true;
}

function mergeBrokenLines(lines: string[]): string[] {
  const merged: string[] = [];
  let buffer = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (buffer) {
        merged.push(buffer);
        buffer = "";
      }
      continue;
    }

    if (!buffer) {
      buffer = line;
      continue;
    }

    const previousEndsWithHardStop = /[.!?:]$/.test(buffer);
    const currentStartsLikeNewBullet = /^[-•*]\s+/.test(line);
    const currentStartsWithUpper = /^[A-Z0-9]/.test(line);
    const previousLooksHeading = /^[A-Z][A-Z\s]+$/.test(buffer);
    // Detect if the current line is contact-style info (email, pipe-separated, URL)
    const currentLooksLikeContactInfo =
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i.test(line) ||
      /\|/.test(line) ||
      /https?:\/\//i.test(line);

    if (
      currentStartsLikeNewBullet ||
      previousEndsWithHardStop ||
      previousLooksHeading ||
      currentLooksLikeContactInfo
    ) {
      merged.push(buffer);
      buffer = line;
      continue;
    }

    if (!currentStartsWithUpper || buffer.endsWith("-")) {
      buffer = buffer.replace(/-$/, "") + " " + line;
      continue;
    }

    merged.push(buffer);
    buffer = line;
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}

function detectSection(line: string): ResumeSection | null {
  const cleaned = line.replace(/:$/, "").trim();
  for (const heading of SECTION_HEADINGS) {
    if (heading.pattern.test(cleaned)) {
      return heading.section;
    }
  }
  return null;
}

function buildEvidenceMap(
  extractedData: Partial<ResumeDataRequirements>,
  cleanedLines: string[],
  sections: Record<ResumeSection, string[]>,
): EvidenceMap {
  const evidenceMap: EvidenceMap = {};
  const lowercaseLines = cleanedLines.map((line) => line.toLowerCase());

  for (const [field, value] of Object.entries(extractedData)) {
    if (typeof value === "string" && value.trim().length > 0) {
      const matchingLines = cleanedLines.filter((line, index) =>
        lowercaseLines[index]?.includes(value.toLowerCase()),
      );
      evidenceMap[field] =
        matchingLines.length > 0 ? matchingLines.slice(0, 3) : [value];
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      const serialized = value
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object") return JSON.stringify(entry);
          return "";
        })
        .filter((entry) => entry.length > 0);

      const hits = cleanedLines.filter((line) =>
        serialized.some((candidate) =>
          line.toLowerCase().includes(candidate.toLowerCase().slice(0, 40)),
        ),
      );

      evidenceMap[field] = (hits.length > 0 ? hits : serialized).slice(0, 3);
    }
  }

  for (const [section, sectionLines] of Object.entries(sections)) {
    if (sectionLines.length > 0) {
      evidenceMap[`section:${section}`] = sectionLines.slice(0, 2);
    }
  }

  return evidenceMap;
}

function getMissingCriticalFields(
  extractedData: Partial<ResumeDataRequirements>,
): string[] {
  const missing: string[] = REQUIRED_FIELDS.filter((field) => {
    const value = extractedData[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  const hasSummary =
    typeof extractedData.summary === "string" &&
    extractedData.summary.trim().length > 0;
  const hasExperience =
    Array.isArray(extractedData.experience) &&
    extractedData.experience.length > 0;
  const hasEducation =
    Array.isArray(extractedData.education) &&
    extractedData.education.length > 0;
  const hasSkills =
    Array.isArray(extractedData.skills) && extractedData.skills.length > 0;

  if (!hasExperience && !hasEducation) {
    missing.push("experience_or_education");
  }

  if (!hasSummary && !hasExperience) {
    missing.push("summary");
  }

  if (!hasSkills) {
    missing.push("skills");
  }

  return missing;
}

export class ResumeIntakeNormalizer {
  static normalize(
    input: NormalizeResumeIntakeInput,
  ): NormalizeResumeIntakeResult {
    const mergedText = input.sources
      .map((source) => source.text.trim())
      .filter((text) => text.length > 0)
      .join("\n\n");

    const normalized = normalizeWhitespace(mergedText);
    const rawLines = normalized.split("\n").map((line) => line.trim());
    const lineCounts = new Map<string, number>();

    for (const line of rawLines) {
      const normalizedLine = line.toLowerCase();
      lineCounts.set(normalizedLine, (lineCounts.get(normalizedLine) ?? 0) + 1);
    }

    const cleanedLines = mergeBrokenLines(
      rawLines.filter((line) => !isLikelyHeaderFooter(line, lineCounts)),
    );

    const sections: Record<ResumeSection, string[]> = {
      contact: [],
      summary: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      other: [],
    };

    let currentSection: ResumeSection = "other";
    for (const line of cleanedLines) {
      const detectedSection = detectSection(line);
      if (detectedSection) {
        currentSection = detectedSection;
        continue;
      }

      sections[currentSection].push(line);
    }

    const cleanedText = cleanedLines.join("\n");
    const extraction = ResumeDataExtractor.extract(cleanedText);
    const evidenceMap = buildEvidenceMap(
      extraction.data,
      cleanedLines,
      sections,
    );
    const missingCriticalFields = getMissingCriticalFields(extraction.data);

    return {
      draft: {
        mergedText,
        cleanedText,
        sections,
        extractedData: extraction.data,
        extractedFields: extraction.extractedFields,
      },
      evidenceMap,
      missingCriticalFields,
    };
  }

  /**
   * AI-powered normalize for paste and PDF sources.
   * Uses AI structured extraction first, falls back to regex.
   * Reuses the same cleaning/section pipeline but replaces
   * the extraction step with AI when available.
   *
   * @param input - Resume intake sources
   * @param options - AI extraction options (tier, skip flag)
   * @returns NormalizeResumeIntakeResult with AI-extracted or regex-extracted data
   */
  static async normalizeWithAI(
    input: NormalizeResumeIntakeInput,
    options?: {
      userTier?: "basic" | "premium" | "enterprise";
      skipAI?: boolean;
      observationContext?: AIObservationContext;
    },
  ): Promise<
    NormalizeResumeIntakeResult & { extractionMethod: "ai" | "regex" }
  > {
    // Run the same cleaning pipeline
    const mergedText = input.sources
      .map((source) => source.text.trim())
      .filter((text) => text.length > 0)
      .join("\n\n");

    const normalized = normalizeWhitespace(mergedText);
    const rawLines = normalized.split("\n").map((line) => line.trim());
    const lineCounts = new Map<string, number>();

    for (const line of rawLines) {
      const normalizedLine = line.toLowerCase();
      lineCounts.set(normalizedLine, (lineCounts.get(normalizedLine) ?? 0) + 1);
    }

    const cleanedLines = mergeBrokenLines(
      rawLines.filter((line) => !isLikelyHeaderFooter(line, lineCounts)),
    );

    const sections: Record<ResumeSection, string[]> = {
      contact: [],
      summary: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      other: [],
    };

    let currentSection: ResumeSection = "other";
    for (const line of cleanedLines) {
      const detectedSection = detectSection(line);
      if (detectedSection) {
        currentSection = detectedSection;
        continue;
      }
      sections[currentSection].push(line);
    }

    const cleanedText = cleanedLines.join("\n");
    const deterministicExtraction = ResumeDataExtractor.extract(cleanedText);
    let extractionMethod: "ai" | "regex" = "regex";
    let extractedData: Partial<ResumeDataRequirements> = {};
    let extractedFields: string[] = [];

    // Try AI extraction for paste/PDF sources
    const hasPasteOrPdfSource = input.sources.some(
      (s) =>
        s.channel === "paste" || s.channel === "pdf" || s.channel === "docx",
    );

    if (hasPasteOrPdfSource && !options?.skipAI) {
      try {
        const { extractWithStructuredOutput } =
          await import("@/lib/services/aiExtractionService");

        const aiResult = await extractWithStructuredOutput(cleanedText, {
          userTier: options?.userTier ?? "premium",
          observationContext: options?.observationContext,
        });

        if (aiResult.success && aiResult.data) {
          extractedData = mergeAIWithDeterministicBackstop(
            aiResult.data,
            deterministicExtraction.data,
          );
          extractedFields = Object.keys(extractedData);
          extractionMethod = "ai";

          logger.info(
            {
              fields: extractedFields,
              latencyMs: aiResult.latencyMs,
              channel: input.sources.map((s) => s.channel),
            },
            "AI extraction used for intake normalization",
          );
        }
      } catch (error) {
        logger.warn(
          { err: error },
          "AI extraction failed in normalizer, falling back to regex",
        );
      }
    }

    // Fallback to regex extraction
    if (extractionMethod === "regex") {
      extractedData = deterministicExtraction.data;
      extractedFields = deterministicExtraction.extractedFields;
    }

    const evidenceMap = buildEvidenceMap(extractedData, cleanedLines, sections);
    const missingCriticalFields = getMissingCriticalFields(extractedData);

    return {
      draft: {
        mergedText,
        cleanedText,
        sections,
        extractedData,
        extractedFields,
      },
      evidenceMap,
      missingCriticalFields,
      extractionMethod,
    };
  }
}
