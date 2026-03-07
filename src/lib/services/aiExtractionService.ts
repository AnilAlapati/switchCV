/**
 * AI Extraction Service
 *
 * Uses Gemini Structured Output to extract resume data from raw text.
 * This is the ONLY extraction path — there is no regex fallback.
 * If AI is unavailable, the caller must surface an error to the user.
 *
 * @module services/aiExtractionService
 */

import { logger } from "@/lib/logger";
import { adminDb } from "@/lib/firebase-admin";
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
- CRITICAL: Lines that list technology keywords separated by spaces (e.g. "API Nextjs UiPath Firebase") are SKILLS, NOT job titles or company names. Only extract experience entries where there is a clear job title (e.g. "Software Engineer", "RPA Developer") and a real company name (e.g. "JPMorgan Chase", "IBM India").
- If a section is labelled "KEY SKILLS", "SKILLS", "TECHNICAL SKILLS", "CERTIFICATION", or "PROJECTS", its contents are NOT work experience.
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

// ---------------------------------------------------------------------------
// Failure tracking — alert admin when AI extraction is down for extended period
// ---------------------------------------------------------------------------

const ADMIN_ALERT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

interface FailureTracker {
  /** Timestamp of the first consecutive failure (null = no active failure window) */
  firstFailureAt: number | null;
  /** Whether an admin alert has already been sent for the current failure window */
  adminAlertSent: boolean;
  /** Total consecutive failures in current window */
  consecutiveFailures: number;
}

const failureTracker: FailureTracker = {
  firstFailureAt: null,
  adminAlertSent: false,
  consecutiveFailures: 0,
};

/** Reset tracker on success */
function recordExtractionSuccess(): void {
  failureTracker.firstFailureAt = null;
  failureTracker.adminAlertSent = false;
  failureTracker.consecutiveFailures = 0;
}

/** Record failure and alert admin if threshold exceeded */
function recordExtractionFailure(errorMsg: string): void {
  const now = Date.now();
  failureTracker.consecutiveFailures += 1;

  if (failureTracker.firstFailureAt === null) {
    failureTracker.firstFailureAt = now;
  }

  const downDurationMs = now - failureTracker.firstFailureAt;

  if (
    downDurationMs >= ADMIN_ALERT_THRESHOLD_MS &&
    !failureTracker.adminAlertSent
  ) {
    failureTracker.adminAlertSent = true;
    const downMinutes = Math.round(downDurationMs / 60_000);

    const alertTime = new Date();
    const alertLabel = `[SWITCHCV ALERT] AI Extraction Down — ${alertTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

    logger.error(
      {
        consecutiveFailures: failureTracker.consecutiveFailures,
        downMinutes,
        firstFailureAt: new Date(failureTracker.firstFailureAt).toISOString(),
        latestError: errorMsg,
      },
      `🚨 ${alertLabel}: ${failureTracker.consecutiveFailures} consecutive failures`,
    );

    // Send admin email via Firestore mail collection (Firebase Trigger Email extension)
    const alertId = `ai-alert-${alertTime.getTime()}`;
    const html = `
      <h2 style="color:#c0392b">🚨 AI Extraction Service Alert</h2>
      <p>The AI extraction service on <strong>SwitchCV</strong> has been failing continuously for <strong>${downMinutes} minutes</strong> and requires attention.</p>
      <table style="border-collapse:collapse;width:100%;font-family:monospace;font-size:14px">
        <tr><td style="padding:6px 12px;background:#f8f9fa;border:1px solid #dee2e6">Consecutive failures</td><td style="padding:6px 12px;border:1px solid #dee2e6">${failureTracker.consecutiveFailures}</td></tr>
        <tr><td style="padding:6px 12px;background:#f8f9fa;border:1px solid #dee2e6">Down since</td><td style="padding:6px 12px;border:1px solid #dee2e6">${new Date(failureTracker.firstFailureAt!).toISOString()}</td></tr>
        <tr><td style="padding:6px 12px;background:#f8f9fa;border:1px solid #dee2e6">Down for</td><td style="padding:6px 12px;border:1px solid #dee2e6">${downMinutes} minutes</td></tr>
        <tr><td style="padding:6px 12px;background:#f8f9fa;border:1px solid #dee2e6">Latest error</td><td style="padding:6px 12px;border:1px solid #dee2e6">${errorMsg}</td></tr>
        <tr><td style="padding:6px 12px;background:#f8f9fa;border:1px solid #dee2e6">Alert time</td><td style="padding:6px 12px;border:1px solid #dee2e6">${alertTime.toISOString()}</td></tr>
      </table>
      <p style="margin-top:16px">Users are currently seeing a &ldquo;please try again later&rdquo; message. No data has been lost.</p>
    `;

    void adminDb
      .collection("mail")
      .doc(alertId)
      .set({
        to: "support@switchcv.com",
        message: {
          subject: alertLabel,
          html,
          text: `AI Extraction Service Alert\n\nDown for ${downMinutes} minutes (${failureTracker.consecutiveFailures} consecutive failures).\nLatest error: ${errorMsg}\nFirst failure: ${new Date(failureTracker.firstFailureAt!).toISOString()}`,
        },
        createdAt: alertTime,
      })
      .catch((mailErr: unknown) => {
        logger.error({ err: mailErr }, "Failed to queue admin alert email");
      });
  }
}

/** Expose tracker state for testing */
export function getFailureTrackerState(): Readonly<FailureTracker> {
  return { ...failureTracker };
}

/** Reset tracker (for testing only) */
export function resetFailureTracker(): void {
  failureTracker.firstFailureAt = null;
  failureTracker.adminAlertSent = false;
  failureTracker.consecutiveFailures = 0;
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
      recordExtractionFailure("AI returned empty response");
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
      recordExtractionFailure("AI response was not valid JSON");
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
      recordExtractionFailure("AI response failed schema validation");
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

    recordExtractionSuccess();

    return {
      success: true,
      data,
      method: "ai",
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "AI extraction call failed";
    logger.error(
      { err: error },
      "AI extraction failed — no fallback, user will be asked to retry",
    );
    recordExtractionFailure(errorMsg);
    return {
      success: false,
      data: null,
      method: "fallback",
      latencyMs: Date.now() - startTime,
      error: errorMsg,
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
