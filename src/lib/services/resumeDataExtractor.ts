/**
 * Resume Data Extractor Service (Refactored)
 *
 * Coordinator that uses specialized strategies to extract resume data.
 *
 * @module services/resumeDataExtractor
 */

import { ResumeDataRequirements } from "./conversationManager";
import { ContactExtractor } from "./extractors/ContactExtractor";
import { SkillsExtractor } from "./extractors/SkillsExtractor";
import { ExperienceExtractor } from "./extractors/ExperienceExtractor";
import { EducationExtractor } from "./extractors/EducationExtractor";
import { JSONExtractor } from "./extractors/JSONExtractor";
import { logger } from "@/lib/logger";
import type { AIExtractionResult } from "@/lib/services/aiExtractionService";

export interface ExtractionResult {
  /** Successfully extracted data */
  data: Partial<ResumeDataRequirements>;
  /** Confidence score (0-1) for the extraction */
  confidence: number;
  /** Fields that were extracted */
  extractedFields: string[];
  /** Whether AI indicated completion */
  isComplete: boolean;
}

/**
 * Resume Data Extractor
 *
 * Parses conversation text and AI responses to extract structured resume data.
 * Uses Strategy Pattern with specialized extractors.
 */
export class ResumeDataExtractor {
  private static normalizeComparableString(value?: string): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }

  private static mergeStringField(
    existingValue?: string,
    extractedValue?: string,
  ): string {
    return extractedValue?.trim() || existingValue?.trim() || "";
  }

  private static mergeStringArray(
    existingValues?: string[],
    extractedValues?: string[],
  ): string[] | undefined {
    const merged = [...(existingValues || []), ...(extractedValues || [])]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (merged.length === 0) {
      return undefined;
    }

    return [...new Set(merged)];
  }

  private static findMatchingExperienceIndex(
    existing: ResumeDataRequirements["experience"],
    candidate: ResumeDataRequirements["experience"][number],
  ): number {
    const candidateTitle = this.normalizeComparableString(candidate.title);
    const candidateCompany = this.normalizeComparableString(candidate.company);

    return existing.findIndex((entry) => {
      const entryTitle = this.normalizeComparableString(entry.title);
      const entryCompany = this.normalizeComparableString(entry.company);

      if (!candidateTitle || !entryTitle || candidateTitle !== entryTitle) {
        return false;
      }

      if (candidateCompany && entryCompany) {
        return candidateCompany === entryCompany;
      }

      return true;
    });
  }

  private static mergeExperienceEntry(
    existing: ResumeDataRequirements["experience"][number],
    extracted: ResumeDataRequirements["experience"][number],
  ): ResumeDataRequirements["experience"][number] {
    return {
      ...existing,
      ...extracted,
      title: this.mergeStringField(existing.title, extracted.title),
      company: this.mergeStringField(existing.company, extracted.company),
      duration: this.mergeStringField(existing.duration, extracted.duration),
      description: this.mergeStringField(
        existing.description,
        extracted.description,
      ),
      achievements:
        this.mergeStringArray(existing.achievements, extracted.achievements) ||
        [],
    };
  }

  private static findMatchingEducationIndex(
    existing: ResumeDataRequirements["education"],
    candidate: ResumeDataRequirements["education"][number],
  ): number {
    const candidateInstitution = this.normalizeComparableString(
      candidate.institution,
    );
    const candidateDegree = this.normalizeComparableString(candidate.degree);

    return existing.findIndex((entry) => {
      const entryInstitution = this.normalizeComparableString(
        entry.institution,
      );
      const entryDegree = this.normalizeComparableString(entry.degree);

      if (!candidateInstitution || !entryInstitution) {
        return candidateDegree.length > 0 && candidateDegree === entryDegree;
      }

      if (!candidateDegree || !entryDegree) {
        return candidateInstitution === entryInstitution;
      }

      return (
        candidateInstitution === entryInstitution &&
        candidateDegree === entryDegree
      );
    });
  }

  private static mergeEducationEntry(
    existing: ResumeDataRequirements["education"][number],
    extracted: ResumeDataRequirements["education"][number],
  ): ResumeDataRequirements["education"][number] {
    return {
      ...existing,
      ...extracted,
      degree: this.mergeStringField(existing.degree, extracted.degree),
      institution: this.mergeStringField(
        existing.institution,
        extracted.institution,
      ),
      year: this.mergeStringField(existing.year, extracted.year),
      major: this.mergeStringField(existing.major, extracted.major),
      gpa: this.mergeStringField(existing.gpa, extracted.gpa),
    };
  }

  /**
   * Extract resume data from AI response text
   */
  static extract(
    responseText: string,
    context?: "education" | "experience" | "skills" | "contact" | null,
  ): ExtractionResult {
    const data: Partial<ResumeDataRequirements> = {};
    const extractedFields: string[] = [];
    let confidence = 0.5; // Base confidence
    let isComplete = false;

    // Detect context if not provided
    const localContext = context || this.detectContext(responseText);

    // 1. JSON Strategy (Highest Confidence)
    const jsonExtractor = new JSONExtractor();
    const jsonData = jsonExtractor.extract(responseText);

    if (Object.keys(jsonData).length > 0) {
      Object.assign(data, jsonData);
      if (jsonData.isComplete) isComplete = true;
      // Clean up isComplete from data object if it leaked there
      delete (data as Record<string, unknown>).isComplete;

      confidence = 0.95;
      extractedFields.push(...Object.keys(jsonData));
    }

    // 2. Pattern Strategy (Accumulative)
    // We run these even if JSON was found, to catch things the AI might have mentioned in text but missed in JSON
    // or if JSON extraction failed.

    const extractors = [
      new ContactExtractor(),
      new SkillsExtractor(),
      new ExperienceExtractor(),
      new EducationExtractor(),
    ];

    for (const extractor of extractors) {
      const result = extractor.extract(responseText, localContext);
      // Only merge if we found something new (simple merge logic)
      // ideally we would use deep merge, but shallow merge of sections is fine for now
      this.mergeData(data, result);

      const keys = Object.keys(result);
      if (keys.length > 0) extractedFields.push(...keys);
    }

    // 3. Completion Check
    if (this.hasCompletionMarker(responseText)) {
      isComplete = true;
      confidence = Math.max(confidence, 0.8);
    }

    return {
      data,
      confidence,
      extractedFields: [...new Set(extractedFields)],
      isComplete,
    };
  }

  /**
   * Detect context from AI message
   */
  private static detectContext(
    text: string,
  ): "education" | "experience" | "skills" | "contact" | null {
    const lower = text.toLowerCase();
    if (
      lower.includes("education") ||
      lower.includes("degree") ||
      lower.includes("university") ||
      lower.includes("school") ||
      lower.includes("college") ||
      lower.includes("major") ||
      lower.includes("graduate")
    )
      return "education";

    if (
      lower.includes("experience") ||
      lower.includes("work") ||
      lower.includes("job") ||
      lower.includes("company") ||
      lower.includes("role") ||
      lower.includes("position")
    )
      return "experience";

    if (
      lower.includes("skill") ||
      lower.includes("technology") ||
      lower.includes("technologies") ||
      lower.includes("proficient")
    )
      return "skills";

    if (
      lower.includes("email") ||
      lower.includes("phone") ||
      lower.includes("contact") ||
      lower.includes("name")
    )
      return "contact";

    return null;
  }

  /**
   * Check if text contains completion markers
   */
  private static hasCompletionMarker(text: string): boolean {
    const completionMarkers = [
      "RESUME_COMPLETE",
      "ready to create",
      "create your resume",
      "have all the information",
      "gathered enough information",
      "proceed with creating",
    ];

    return completionMarkers.some((marker) =>
      text.toLowerCase().includes(marker.toLowerCase()),
    );
  }

  /**
   * Merge extracted data with existing data
   */
  static mergeData(
    existing: Partial<ResumeDataRequirements>,
    extracted: Partial<ResumeDataRequirements>,
  ): Partial<ResumeDataRequirements> {
    // Merge simple fields (strings) - Overwrite if present in extracted
    if (extracted.name) existing.name = extracted.name;
    if (extracted.email) existing.email = extracted.email;
    if (extracted.phone) existing.phone = extracted.phone;
    if (extracted.location) existing.location = extracted.location;
    if (extracted.github) existing.github = extracted.github;
    if (extracted.linkedin) existing.linkedin = extracted.linkedin;
    if (extracted.twitter) existing.twitter = extracted.twitter;
    if (extracted.summary) existing.summary = extracted.summary;

    // Merge arrays with deduplication

    // Experience
    if (extracted.experience) {
      const existingExp = [...(existing.experience || [])];

      for (const extractedEntry of extracted.experience) {
        const matchIndex = this.findMatchingExperienceIndex(
          existingExp,
          extractedEntry,
        );

        if (matchIndex >= 0) {
          existingExp[matchIndex] = this.mergeExperienceEntry(
            existingExp[matchIndex],
            extractedEntry,
          );
          continue;
        }

        existingExp.push(extractedEntry);
      }

      existing.experience = existingExp;
    }

    // Education
    if (extracted.education) {
      const existingEdu = [...(existing.education || [])];

      for (const extractedEntry of extracted.education) {
        const matchIndex = this.findMatchingEducationIndex(
          existingEdu,
          extractedEntry,
        );

        if (matchIndex >= 0) {
          existingEdu[matchIndex] = this.mergeEducationEntry(
            existingEdu[matchIndex],
            extractedEntry,
          );
          continue;
        }

        existingEdu.push(extractedEntry);
      }

      existing.education = existingEdu;
    }

    // Skills
    if (extracted.skills) {
      const allSkills = [...(existing.skills || []), ...extracted.skills];
      existing.skills = [...new Set(allSkills)];
    }

    return existing;
  }

  /**
   * Extract data from entire conversation history
   */
  static extractFromConversation(
    messages: Array<{ content: string; isUser: boolean }>,
  ): ExtractionResult {
    let aggregatedData: Partial<ResumeDataRequirements> = {};
    let maxConfidence = 0;
    let isComplete = false;

    // Track current context across the conversation
    let currentContext:
      | "education"
      | "experience"
      | "skills"
      | "contact"
      | null = null;

    // Extract from each message sequentially
    for (const message of messages) {
      // Detect context from the message (assistant prompts often provide section cues)
      const detectedContext = this.detectContext(message.content);
      if (detectedContext) {
        currentContext = detectedContext;
      }

      if (!message.isUser) {
        // Assistant messages can indicate completion, but never provide extractable user values.
        if (this.hasCompletionMarker(message.content)) {
          isComplete = true;
          maxConfidence = Math.max(maxConfidence, 0.8);
        }
        continue;
      }

      // Only user-authored content is eligible for extraction.
      const result = this.extract(message.content, currentContext);

      // Merge into aggregated state
      aggregatedData = this.mergeData(aggregatedData, result.data);
      maxConfidence = Math.max(maxConfidence, result.confidence);
      isComplete = isComplete || result.isComplete;
    }

    return {
      data: aggregatedData,
      confidence: maxConfidence,
      extractedFields: Object.keys(aggregatedData),
      isComplete,
    };
  }

  /**
   * Extract from conversation using AI structured output (Gemini).
   * NO regex fallback — if AI fails, returns a failure result so the caller
   * can surface a user-friendly error.
   *
   * @param messages - Conversation messages
   * @param options - AI extraction options (tier, skip flag)
   * @returns ExtractionResult with data, confidence, and method used
   */
  static async extractFromConversationWithAI(
    messages: Array<{ content: string; isUser: boolean }>,
    options?: {
      userTier?: "basic" | "premium" | "enterprise";
      skipAI?: boolean;
    },
  ): Promise<ExtractionResult & { method: "ai" | "regex" }> {
    // Combine all user messages into a single text block
    const userText = messages
      .filter((m) => m.isUser)
      .map((m) => m.content)
      .join("\n\n");

    if (options?.skipAI) {
      logger.warn("AI extraction explicitly skipped — returning empty result");
      return {
        data: {},
        confidence: 0,
        extractedFields: [],
        isComplete: false,
        method: "regex", // legacy label kept for type compat
      };
    }

    if (userText.trim().length < 10) {
      logger.warn(
        "User text too short for AI extraction — returning empty result",
      );
      return {
        data: {},
        confidence: 0.1, // Low but non-zero: "no data yet", NOT "AI failure"
        extractedFields: [],
        isComplete: false,
        method: "ai",
      };
    }

    try {
      const { extractWithStructuredOutput } =
        await import("@/lib/services/aiExtractionService");

      const aiResult: AIExtractionResult = await extractWithStructuredOutput(
        userText,
        {
          userTier: options?.userTier ?? "premium",
        },
      );

      if (aiResult.success && aiResult.data) {
        // Check completion from assistant messages
        let isComplete = false;
        for (const message of messages) {
          if (!message.isUser && this.hasCompletionMarker(message.content)) {
            isComplete = true;
            break;
          }
        }

        logger.info(
          {
            method: "ai",
            fields: Object.keys(aiResult.data),
            latencyMs: aiResult.latencyMs,
          },
          "AI extraction succeeded for conversation",
        );

        return {
          data: aiResult.data,
          confidence: 0.95,
          extractedFields: Object.keys(aiResult.data),
          isComplete,
          method: "ai",
        };
      }

      // AI returned but extraction was unsuccessful (empty, parse error, etc.)
      logger.error(
        { error: aiResult.error, latencyMs: aiResult.latencyMs },
        "AI extraction returned unsuccessful result — no regex fallback",
      );
      return {
        data: {},
        confidence: 0,
        extractedFields: [],
        isComplete: false,
        method: "ai",
      };
    } catch (error) {
      logger.error(
        { err: error },
        "AI extraction threw an exception — no regex fallback",
      );
      return {
        data: {},
        confidence: 0,
        extractedFields: [],
        isComplete: false,
        method: "ai",
      };
    }
  }
}
