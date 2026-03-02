/**
 * AI Extraction Service
 *
 * Replaces regex-based resume extraction with Gemini Structured Output.
 * Sends raw resume text to the AI with a strict extraction schema, returning
 * typed, validated data. Regex extractors remain as fallback when AI is down.
 *
 * @module services/aiExtractionService
 */

import { logger } from "@/lib/logger";
import {
  ResumeExtractionSchema,
  type ResumeExtractionResult,
} from "@/lib/schemas/resumeExtractionSchema";
import { zodToGeminiSchema } from "@/lib/utils/zodToGeminiSchema";
import type { ResumeDataRequirements } from "@/lib/services/conversationManager";

/** System prompt optimised for extraction (not generation). */
const EXTRACTION_SYSTEM_PROMPT = `You are a resume data extraction assistant. Your ONLY task is to extract structured fields from unstructured resume text.

Rules:
- Extract ONLY information that is explicitly stated in the text. Do NOT infer or fabricate any data.
- If a field is not present in the text, omit it entirely (do not set it to null or empty string).
- For experience entries, keep the original wording of descriptions and achievements.
- For skills, list each distinct skill as a separate string.
- For dates, preserve the original format found in the text.
- For names, use the full name as written (capitalize correctly).
- For phone numbers, keep the original formatting.
- If the input text is not a resume or contains no extractable resume data, return an empty object.`;

/** Options for the extraction call. */
export interface ExtractionOptions {
  /** User subscription tier for model selection. Defaults to "premium". */
  userTier?: "basic" | "premium" | "enterprise";
  /** If true, skip AI and return null (for testing / fallback path). */
  skipAI?: boolean;
}

/** Result of the AI extraction attempt. */
export interface AIExtractionResult {
  /** Whether AI extraction was attempted and succeeded */
  success: boolean;
  /** Extracted data (null if failed) */
  data: Partial<ResumeDataRequirements> | null;
  /** Extraction method used */
  method: "ai" | "fallback";
  /** Latency in milliseconds */
  latencyMs: number;
  /** Error message if extraction failed */
  error?: string;
}

/**
 * Pre-computed Gemini schema for extraction (computed once at module load).
 * This avoids recomputing the schema on every call.
 */
const EXTRACTION_GEMINI_SCHEMA = zodToGeminiSchema(ResumeExtractionSchema);

/**
 * Extract structured resume data from raw text using AI structured output.
 *
 * @param text - Raw resume text (from chat, paste, or PDF)
 * @param options - Extraction options (tier, skip flag)
 * @returns AIExtractionResult with success/data/method/latency
 */
export async function extractWithStructuredOutput(
  text: string,
  options: ExtractionOptions = {},
): Promise<AIExtractionResult> {
  const startTime = Date.now();
  const { userTier = "premium", skipAI = false } = options;

  if (skipAI) {
    return {
      success: false,
      data: null,
      method: "fallback",
      latencyMs: Date.now() - startTime,
      error: "AI extraction skipped",
    };
  }

  if (!text || text.trim().length < 10) {
    return {
      success: false,
      data: null,
      method: "fallback",
      latencyMs: Date.now() - startTime,
      error: "Input text too short for extraction",
    };
  }

  try {
    // Dynamic import to avoid circular dependencies and keep this
    // module usable in both client-bundled tests and server contexts.
    const { generateTextWithTier } =
      await import("@/server/services/aiProviderService");

    const prompt = `${EXTRACTION_SYSTEM_PROMPT}\n\nExtract all resume fields from the following text. Return ONLY the structured data — no explanations, no commentary.\n\n---\nRESUME TEXT:\n${text}\n---`;

    const result = await generateTextWithTier({
      prompt,
      maxTokens: 4000,
      temperature: 0.1, // Low temperature for factual extraction
      userTier,
      jsonMode: true,
      responseSchema: EXTRACTION_GEMINI_SCHEMA as unknown as Record<
        string,
        unknown
      >,
    });

    if (!result.text) {
      return {
        success: false,
        data: null,
        method: "fallback",
        latencyMs: Date.now() - startTime,
        error: "AI returned empty response",
      };
    }

    // Parse the AI response
    const parsed = safeParseJSON(result.text);
    if (!parsed) {
      logger.warn(
        { responseLength: result.text.length },
        "AI extraction returned non-JSON response",
      );
      return {
        success: false,
        data: null,
        method: "fallback",
        latencyMs: Date.now() - startTime,
        error: "AI response was not valid JSON",
      };
    }

    // Validate with Zod schema
    const validated = ResumeExtractionSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn(
        { errors: validated.error.flatten() },
        "AI extraction response failed schema validation",
      );
      return {
        success: false,
        data: null,
        method: "fallback",
        latencyMs: Date.now() - startTime,
        error: "AI response failed schema validation",
      };
    }

    // Convert to ResumeDataRequirements shape
    const data = mapExtractionToRequirements(validated.data);

    logger.info(
      {
        extractedFields: Object.keys(data).filter(
          (k) => data[k as keyof typeof data] !== undefined,
        ),
        latencyMs: Date.now() - startTime,
        model: result.model,
      },
      "AI extraction succeeded",
    );

    return {
      success: true,
      data,
      method: "ai",
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error(
      { err: error },
      "AI extraction failed, will fall back to regex",
    );
    return {
      success: false,
      data: null,
      method: "fallback",
      latencyMs: Date.now() - startTime,
      error: "AI extraction call failed",
    };
  }
}

/**
 * Safely parse JSON from AI response text.
 * Handles both raw JSON and markdown-fenced JSON.
 */
function safeParseJSON(text: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Try extracting from markdown fences
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch?.[1]) {
      try {
        const parsed = JSON.parse(fenceMatch[1]);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Fall through
      }
    }
  }
  return null;
}

/**
 * Map the extraction schema result to the ResumeDataRequirements shape.
 * Filters out undefined fields so the caller only gets what was actually extracted.
 */
function mapExtractionToRequirements(
  extracted: ResumeExtractionResult,
): Partial<ResumeDataRequirements> {
  const data: Partial<ResumeDataRequirements> = {};

  if (extracted.name) data.name = extracted.name;
  if (extracted.email) data.email = extracted.email;
  if (extracted.phone) data.phone = extracted.phone;
  if (extracted.location) data.location = extracted.location;
  if (extracted.github) data.github = extracted.github;
  if (extracted.linkedin) data.linkedin = extracted.linkedin;
  if (extracted.twitter) data.twitter = extracted.twitter;
  if (extracted.summary) data.summary = extracted.summary;

  if (extracted.experience && extracted.experience.length > 0) {
    data.experience = extracted.experience.map((exp) => ({
      title: exp.title,
      company: exp.company,
      duration: exp.duration,
      description: exp.description,
      achievements: exp.achievements,
    }));
  }

  if (extracted.education && extracted.education.length > 0) {
    data.education = extracted.education.map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      year: edu.year,
      major: edu.major,
      gpa: edu.gpa,
    }));
  }

  if (extracted.skills && extracted.skills.length > 0) {
    data.skills = extracted.skills;
  }

  return data;
}
