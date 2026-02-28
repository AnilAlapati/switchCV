import { ResumeDataRequirements } from "@/lib/services/conversationManager";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";

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

const REQUIRED_FIELDS: Array<keyof ResumeDataRequirements> = [
  "name",
  "email",
  "summary",
];

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLikelyHeaderFooter(line: string, counts: Map<string, number>): boolean {
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

    if (currentStartsLikeNewBullet || previousEndsWithHardStop || previousLooksHeading) {
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
      evidenceMap[field] = matchingLines.length > 0 ? matchingLines.slice(0, 3) : [value];
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

  const hasExperience =
    Array.isArray(extractedData.experience) && extractedData.experience.length > 0;
  const hasEducation =
    Array.isArray(extractedData.education) && extractedData.education.length > 0;
  const hasSkills =
    Array.isArray(extractedData.skills) && extractedData.skills.length > 0;

  if (!hasExperience && !hasEducation) {
    missing.push("experience_or_education");
  }

  if (!hasSkills) {
    missing.push("skills");
  }

  return missing;
}

export class ResumeIntakeNormalizer {
  static normalize(input: NormalizeResumeIntakeInput): NormalizeResumeIntakeResult {
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
    const evidenceMap = buildEvidenceMap(extraction.data, cleanedLines, sections);
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
}
