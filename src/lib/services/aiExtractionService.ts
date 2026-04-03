/**
 * AI Extraction Service
 *
 * Uses AI structured output to extract resume data from raw text.
 * If this AI path is unavailable, the caller may choose a deterministic
 * fallback based on local extractors.
 *
 * @module services/aiExtractionService
 */

import { logger } from "@/lib/logger";
import { adminDb } from "@/lib/firebase-admin";
import {
  classifyAIFailure,
  markAIStageFailed,
  persistAIFailureEvent,
  type AIObservationContext,
} from "@/lib/services/aiMonitoringService";
import {
  ResumeExtractionSchema,
  type ResumeExtractionResult,
} from "@/lib/schemas/resumeExtractionSchema";
import { zodToGeminiSchema } from "@/lib/utils/zodToGeminiSchema";
import type { ResumeDataRequirements } from "@/lib/services/conversationManager";

/**
 * Known technology / skill keywords. If both the extracted "title" and
 * "company" consist mostly of these tokens, the AI made a false-positive
 * experience extraction from a KEY SKILLS section.
 */
const KNOWN_TECH_TOKENS = new Set([
  "api",
  "nextjs",
  "next.js",
  "uipath",
  "firebase",
  "react",
  "react.js",
  "angular",
  "vue",
  "node",
  "node.js",
  "python",
  "java",
  "sql",
  "nosql",
  "mongodb",
  "postgresql",
  "graphql",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "typescript",
  "javascript",
  "html",
  "css",
  "git",
  "linux",
  "bash",
  "redis",
  "elasticsearch",
  "tailwind",
  "bootstrap",
  "sass",
  "less",
  "flutter",
  "swift",
  "kotlin",
  "php",
  "ruby",
  "rails",
  "laravel",
  "django",
  "flask",
  "fastapi",
  "spring",
  ".net",
  "c#",
  "c++",
  "go",
  "rust",
  "svelte",
  "nuxt",
  "supabase",
  "microservices",
  "ci/cd",
  "agile",
  "scrum",
  "prompt",
  "engineering",
  "vibe",
  "coding",
  "machine learning",
  "deep learning",
  "nlp",
  "llm",
  "genai",
  "gen ai",
]);

/** Returns true when a string looks like a list of tech skills rather than a job title/company.
 *  Threshold raised to 0.85 to avoid discarding legitimate job titles like
 *  "Senior React Developer" or "Node.js Lead Engineer".
 */
function looksLikeSkillsList(value: string): boolean {
  const tokens = value
    .toLowerCase()
    .split(/[\s,;|/•·]+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  const techCount = tokens.filter((t) => KNOWN_TECH_TOKENS.has(t)).length;
  // Only flag as a skills list when nearly ALL tokens are tech keywords
  // (e.g. "React Angular Firebase" is skills; "React Developer" is a title)
  return techCount / tokens.length >= 0.85 && tokens.length >= 2;
}

/** System prompt optimised for extraction (not generation). */
const EXTRACTION_SYSTEM_PROMPT = `You are a resume data extraction assistant. Your ONLY task is to extract structured fields from a conversation transcript where a user is describing their resume.

Rules:
- Extract ONLY information that is explicitly stated or confirmed by the user. Do NOT fabricate any data.
- If a field is not present, omit it entirely (do not set it to null or empty string).
- For experience entries, keep the original wording of descriptions and achievements.
- For skills, list each distinct skill as a separate string.
- CONVERSATION CONTEXT: When the input is a conversation transcript, [ASSISTANT] lines are questions. However, if the [USER] confirms, agrees, or says "yes" to specific details mentioned in the [ASSISTANT] question, those confirmed details ARE valid resume data. For example, if [ASSISTANT] asks "Did you work at Google from 2020 to 2022?" and [USER] says "Yes, I was a Senior Engineer there", extract company="Google", duration="2020 - 2022", title="Senior Engineer".
- CRITICAL — Skills vs Experience: A list of technology keywords (e.g. "API Nextjs UiPath Firebase", "prompt engineering vibe coding") is ALWAYS a skills list, NOT a job title or company name. Only extract an experience entry when there is a clear human job title (e.g. "Software Engineer", "RPA Developer", "Project Manager") paired with a clear organization name (e.g. "JPMorgan Chase", "IBM India", "Startup XYZ").
- If a section is labelled "KEY SKILLS", "SKILLS", "TECHNICAL SKILLS", or "CERTIFICATION", its contents are NOT work experience.
- PROJECTS: If a section is labelled "PROJECTS" or the user describes personal/side projects, freelance work, or open-source contributions, extract these into the "projects" array — NOT as experience entries. Each project should have a name, description, and optionally technologies used.
- For dates, preserve the original format found in the text.
- For names, use the full name as written.
- For phone numbers, keep the original formatting.
- LOCATION: Only extract location if the user explicitly states where they live or are based (e.g. "I'm based in San Francisco", "located in London", "from Hyderabad"). NEVER infer location from company names (JPMC does not mean New York), university names, or any other indirect evidence. If the user did not explicitly share their location, do NOT include the location field.
- If the input contains no extractable resume data, return an empty object.

EXAMPLE — correct classification (few-shot):

[ASSISTANT]: What technologies do you work with?
[USER]: API Nextjs UiPath Firebase prompt engineering vibe coding
→ These are SKILLS: ["API", "Next.js", "UiPath", "Firebase", "Prompt Engineering"]. Do NOT create an experience entry.

[ASSISTANT]: Tell me about your most recent job.
[USER]: I worked as an RPA Developer at Infosys for 2 years. I built automation workflows using UiPath.
→ experience entry: title="RPA Developer", company="Infosys", duration="2 years", description="Built automation workflows using UiPath".

[ASSISTANT]: Any achievements you're proud of?
[USER]: Reduced invoice processing time by 60%.
→ This is an achievement for the most recent experience entry, not a new entry.

[ASSISTANT]: Did you work at Amazon from 2019 to 2021?
[USER]: Yes, as a Backend Engineer. I built the payment microservice.
→ experience entry: title="Backend Engineer", company="Amazon", duration="2019 - 2021", description="Built the payment microservice".
  The user CONFIRMED the details from the assistant's question — extract them.

[ASSISTANT]: Tell me about any side projects or personal work.
[USER]: I built a budgeting app called SpendWise using React and Firebase. It's on GitHub.
→ project entry: name="SpendWise", description="Budgeting app", technologies=["React", "Firebase"].
  Do NOT create an experience entry for personal projects.

NEGATIVE EXAMPLES — return {} (empty object) for these kinds of messages:

[USER]: how much information did you receive?
→ {} — this is a question about the app, not resume data.

[USER]: i just see name education skills in the preview, nothing much
→ {} — this is a UI complaint. Do NOT extract "name", "education", or "skills" as field values.

[USER]: why isn't the preview updating?
→ {} — UI question. Extract nothing.

[USER]: that's wrong, please fix it
→ {} — correction intent. Extract nothing; the AI will ask the user what to fix.

[USER]: create my resume now
→ {} — creation intent only. No resume fields are being provided.

[USER]: yes / ok / go ahead / sure
→ {} — affirmative response with no data. Extract nothing.`;

/** Options for the extraction call. */
export interface ExtractionOptions {
  /** User subscription tier for model selection. Defaults to "premium". */
  userTier?: "basic" | "premium" | "enterprise";
  /** If true, skip AI and return null (for testing / fallback path). */
  skipAI?: boolean;
  /** Shared AI monitoring context for request correlation. */
  observationContext?: AIObservationContext;
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
  /**
   * The model that actually ran the extraction.
   * Should be "gemini-2.5-pro". If different, a fallback occurred — see logs.
   */
  model?: string;
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
  const { skipAI = false, observationContext } = options;

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

    const prompt = `${EXTRACTION_SYSTEM_PROMPT}\n\nExtract all resume fields from the following conversation transcript. Return ONLY the structured data — no explanations, no commentary.\n\n---\nCONVERSATION TRANSCRIPT:\n${text}\n---`;

    // Always use Gemini 2.5 Pro for extraction regardless of user tier.
    // Reasons:
    // - Only Gemini supports responseSchema (structured JSON output guarantee).
    // - Gemini 2.5 Flash Lite (quality 7) consistently fails to parse informal
    //   conversational text like "started at IBM then TEKsystems, now JPMC SWE3".
    // - Pro (quality 9) costs ~$2.50/1M tokens vs $0.20 for Flash Lite — the
    //   ~$7/month extra at 1,000 resumes is worth reliable extraction.
    const result = await generateTextWithTier({
      prompt,
      maxTokens: 4000,
      temperature: 0.1, // Low temperature for factual extraction
      userTier: "enterprise", // grants access to premium model tier
      modelId: "gemini-2.5-pro", // pin to Gemini 2.5 Pro explicitly
      jsonMode: true,
      responseSchema: EXTRACTION_GEMINI_SCHEMA as unknown as Record<
        string,
        unknown
      >,
      observationContext,
      stage: "extraction",
    });

    // Warn if the provider silently fell back from our pinned model.
    // This can happen if the circuit breaker tripped or GEMINI_API_KEY is
    // missing — in both cases the caller should know extraction quality may
    // be degraded.
    if (result.model !== "gemini-2.5-pro") {
      logger.warn(
        {
          expectedModel: "gemini-2.5-pro",
          actualModel: result.model,
          provider: result.provider,
        },
        "Extraction used a fallback model — quality may be lower than expected",
      );
    }

    if (!result.text) {
      recordExtractionFailure("AI returned empty response");
      if (observationContext) {
        const classification = classifyAIFailure({
          errorMessage: "AI returned empty response",
          emptyResponse: true,
        });
        await persistAIFailureEvent({
          context: observationContext,
          stage: "extraction",
          provider: result.provider,
          model: result.model,
          failureCode: classification.failureCode,
          errorMessage: classification.errorMessage,
          latencyMs: Date.now() - startTime,
          promptPreview: prompt,
          providerErrorClass: classification.providerErrorClass,
        });
        markAIStageFailed(observationContext, "extraction", {
          latencyMs: Date.now() - startTime,
        });
      }
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
      if (observationContext) {
        const classification = classifyAIFailure({
          errorMessage: "AI response was not valid JSON",
          invalidJson: true,
        });
        await persistAIFailureEvent({
          context: observationContext,
          stage: "extraction",
          provider: result.provider,
          model: result.model,
          failureCode: classification.failureCode,
          errorMessage: classification.errorMessage,
          latencyMs: Date.now() - startTime,
          promptPreview: prompt,
          responsePreview: result.text,
          providerErrorClass: classification.providerErrorClass,
        });
        markAIStageFailed(observationContext, "extraction", {
          latencyMs: Date.now() - startTime,
        });
      }
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
      if (observationContext) {
        const flattened = validated.error.flatten();
        const schemaIssueCount =
          flattened.formErrors.length +
          Object.values(flattened.fieldErrors).reduce(
            (count, fieldErrors) => count + fieldErrors.length,
            0,
          );
        const classification = classifyAIFailure({
          errorMessage: "AI response failed schema validation",
          schemaValidationFailed: true,
          schemaErrorCount: schemaIssueCount,
        });
        await persistAIFailureEvent({
          context: observationContext,
          stage: "extraction",
          provider: result.provider,
          model: result.model,
          failureCode: classification.failureCode,
          errorMessage: classification.errorMessage,
          latencyMs: Date.now() - startTime,
          promptPreview: prompt,
          responsePreview: result.text,
          providerErrorClass: classification.providerErrorClass,
          schemaErrorCount: schemaIssueCount,
        });
        markAIStageFailed(observationContext, "extraction", {
          latencyMs: Date.now() - startTime,
        });
      }
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
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "AI extraction call failed";
    logger.error(
      { err: error },
      "AI extraction failed — caller may choose a deterministic fallback",
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
    const validExperience = extracted.experience.filter(
      (exp) =>
        !looksLikeSkillsList(exp.title) && !looksLikeSkillsList(exp.company),
    );
    if (validExperience.length > 0) {
      data.experience = validExperience.map((exp) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.description,
        achievements: exp.achievements,
      }));
    }
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

  if (extracted.projects && extracted.projects.length > 0) {
    data.projects = extracted.projects.map((proj) => ({
      name: proj.name,
      description: proj.description,
      technologies: proj.technologies,
      url: proj.url,
      role: proj.role,
    }));
  }

  return data;
}
