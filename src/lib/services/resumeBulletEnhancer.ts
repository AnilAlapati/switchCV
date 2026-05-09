/**
 * Resume Bullet Enhancer Service
 *
 * Uses Gemini to rewrite experience descriptions and achievements with:
 *   - Stronger action verbs (Led, Built, Architected, Delivered, ...)
 *   - Active voice throughout
 *   - Removed filler language ("responsible for", "worked on", "helped with")
 *   - Clearer impact framing without fabricating metrics
 *
 * This runs AFTER schema validation and BEFORE saveGeneratedResume.
 * If the LLM call fails for any reason, the original data is returned unchanged —
 * enhancement is non-blocking and never prevents resume creation.
 *
 * @module services/resumeBulletEnhancer
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import type { AIObservationContext } from "@/lib/services/aiMonitoringService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExperienceEntryInput {
  title?: string;
  role?: string;
  company: string;
  duration?: string;
  description?: string;
  achievements?: string[];
}

export interface EnhancedExperienceEntry extends ExperienceEntryInput {
  description: string;
  achievements: string[];
  _enhanced?: true;
}

export interface BulletEnhancementResult {
  /** Whether LLM enhancement was attempted and succeeded */
  enhanced: boolean;
  /** Experience entries with improved language (or originals if enhancement failed) */
  experience: EnhancedExperienceEntry[];
  /** Summary of what changed */
  annotations: string[];
}

// ---------------------------------------------------------------------------
// Output schema — used for Gemini structured output
// ---------------------------------------------------------------------------

const EnhancedEntrySchema = z.object({
  index: z
    .number()
    .int()
    .describe("Zero-based index matching the input entry position"),
  description: z
    .string()
    .describe("Rewritten job description with active voice and impact focus"),
  achievements: z
    .array(z.string())
    .describe("Rewritten or preserved achievement bullets with strong verbs"),
});

const EnhancedOutputSchema = z.object({
  entries: z
    .array(EnhancedEntrySchema)
    .describe("All enhanced experience entries"),
});

// ---------------------------------------------------------------------------
// Enhancement prompt
// ---------------------------------------------------------------------------

function buildEnhancementPrompt(entries: ExperienceEntryInput[]): string {
  const entriesSerialized = entries
    .map((e, i) => {
      const title = e.role || e.title || "Unknown Role";
      const lines: string[] = [
        `Entry ${i} — ${title} @ ${e.company}${e.duration ? ` (${e.duration})` : ""}:`,
        `  description: ${e.description || "(none)"}`,
      ];
      if (e.achievements && e.achievements.length > 0) {
        lines.push(`  achievements:`);
        e.achievements.forEach((a) => lines.push(`    - ${a}`));
      }
      return lines.join("\n");
    })
    .join("\n\n");

  return `You are an expert resume writer specializing in ATS-optimized content. Your task is to enhance the work experience entries below.

STRICT RULES — you MUST follow all of these:
1. NEVER invent metrics, percentages, dollar amounts, or achievements that are not already present in the source text
2. NEVER add new claims, companies, dates, or responsibilities that aren't stated
3. NEVER change the core meaning or factual content
4. DO rewrite passive voice to active voice ("was responsible for managing" → "Managed")
5. DO lead every sentence with a strong action verb — preferred verbs: Led, Built, Architected, Designed, Implemented, Delivered, Reduced, Increased, Optimized, Launched, Automated, Streamlined, Owned, Spearheaded, Migrated, Scaled, Mentored, Deployed, Engineered
6. DO remove weak filler phrases: "responsible for", "duties included", "worked with", "helped with", "assisted in", "involved in", "participated in"
7. DO make impact clearer using language ALREADY in the source (e.g. if the source says "bots that handled invoices", the rewrite can say "Automated invoice processing workflows" — that's implicit, not fabricated)
8. DO preserve all technology names, company names, dates, and numeric values exactly as they appear
9. If the description already uses strong active verbs and has no weak language, return it with minimal changes — do NOT pad or over-rewrite
10. For "achievements" — if the description already contains achievement-type sentences (quantified impact, scope claims), you MAY move them to achievements for better structure — but do NOT invent new ones

Return ONLY valid JSON matching this schema:
{
  "entries": [
    {
      "index": 0,
      "description": "...",
      "achievements": ["...", "..."]
    }
  ]
}

EXPERIENCE ENTRIES TO ENHANCE:

${entriesSerialized}

Return the enhanced JSON now:`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enhance the experience bullet points in a resume candidate using Gemini.
 *
 * @param candidateData - Full resume data after validation
 * @param options - Enhancement options
 * @returns Enhanced data with updated experience entries
 */
export async function enhanceBulletsWithLLM(
  candidateData: Record<string, unknown>,
  options: {
    userId: string;
    userTier: string;
    observationContext?: AIObservationContext;
  },
): Promise<BulletEnhancementResult> {
  const { userId, userTier, observationContext } = options;

  const rawExperience = candidateData.experience as
    | ExperienceEntryInput[]
    | undefined;

  // Nothing to enhance
  if (!rawExperience || rawExperience.length === 0) {
    return { enhanced: false, experience: [], annotations: [] };
  }

  // Filter out entries that have no content to enhance
  const entriesToEnhance = rawExperience.filter(
    (e) =>
      (e.description && e.description.trim().length > 20) ||
      (e.achievements && e.achievements.length > 0),
  );

  if (entriesToEnhance.length === 0) {
    return {
      enhanced: false,
      experience: rawExperience as EnhancedExperienceEntry[],
      annotations: [],
    };
  }

  try {
    // Dynamic import to keep module usable outside server context
    const { generateTextWithTier } =
      await import("@/server/services/aiProviderService");
    const { zodToGeminiSchema } = await import("@/lib/utils/zodToGeminiSchema");

    const prompt = buildEnhancementPrompt(entriesToEnhance);
    const geminiSchema = zodToGeminiSchema(EnhancedOutputSchema);

    const result = await generateTextWithTier({
      prompt,
      maxTokens: 3000,
      temperature: 0.3, // Low enough to stay factual, some creativity allowed
      userTier: "enterprise", // Pin to best model for quality
      modelId: "gemini-2.5-pro",
      jsonMode: true,
      responseSchema: geminiSchema as unknown as Record<string, unknown>,
      observationContext,
      stage: "enhancement",
    });

    // Track billing
    await BillingService.trackUsage(userId, result.model || "gemini-2.5-pro", {
      input: Math.ceil(prompt.length / 4),
      output: Math.ceil(result.text.length / 4),
    });

    if (!result.text) {
      logger.warn({ userId }, "LLM bullet enhancement: empty response");
      return {
        enhanced: false,
        experience: rawExperience as EnhancedExperienceEntry[],
        annotations: [],
      };
    }

    // Parse and validate
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      logger.warn(
        { userId, responsePreview: result.text.slice(0, 200) },
        "LLM bullet enhancement: response was not valid JSON",
      );
      return {
        enhanced: false,
        experience: rawExperience as EnhancedExperienceEntry[],
        annotations: [],
      };
    }

    const validated = EnhancedOutputSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn(
        { userId, errors: validated.error.flatten() },
        "LLM bullet enhancement: response failed schema validation",
      );
      return {
        enhanced: false,
        experience: rawExperience as EnhancedExperienceEntry[],
        annotations: [],
      };
    }

    const { entries: enhancedEntries } = validated.data;

    // Build a lookup by index
    const enhancementByIndex = new Map(
      enhancedEntries.map((e) => [e.index, e]),
    );

    const annotations: string[] = [];
    let anyChanged = false;

    // Merge back: for each entry in rawExperience, apply enhancement if available
    const mergedExperience: EnhancedExperienceEntry[] = rawExperience.map(
      (orig, i) => {
        // Find which position this entry is in the entriesToEnhance array
        const enhanceIndex = entriesToEnhance.indexOf(orig);
        if (enhanceIndex === -1) {
          return orig as EnhancedExperienceEntry;
        }

        const enhanced = enhancementByIndex.get(enhanceIndex);
        if (!enhanced) {
          return orig as EnhancedExperienceEntry;
        }

        const descChanged =
          enhanced.description &&
          enhanced.description.trim() !== (orig.description || "").trim();
        const achieveChanged =
          enhanced.achievements &&
          enhanced.achievements.length > 0 &&
          JSON.stringify(enhanced.achievements) !==
            JSON.stringify(orig.achievements || []);

        if (descChanged || achieveChanged) {
          anyChanged = true;
          const title = orig.role || orig.title || "Unknown";
          if (descChanged) {
            annotations.push(
              `${title} @ ${orig.company}: description enhanced`,
            );
          }
          if (achieveChanged) {
            annotations.push(
              `${title} @ ${orig.company}: achievements enhanced`,
            );
          }
        }

        return {
          ...orig,
          description: enhanced.description || orig.description || "",
          achievements:
            enhanced.achievements && enhanced.achievements.length > 0
              ? enhanced.achievements
              : orig.achievements || [],
          _enhanced: true,
        };
      },
    );

    logger.info(
      {
        userId,
        entryCount: rawExperience.length,
        enhancedCount: annotations.length,
        model: result.model,
      },
      anyChanged
        ? "✨ LLM bullet enhancement applied"
        : "ℹ️ LLM bullet enhancement: no changes needed",
    );

    return {
      enhanced: anyChanged,
      experience: mergedExperience,
      annotations,
    };
  } catch (err) {
    // Enhancement failure MUST NEVER block resume creation
    logger.warn(
      { err, userId },
      "LLM bullet enhancement failed — using original content",
    );
    return {
      enhanced: false,
      experience: rawExperience as EnhancedExperienceEntry[],
      annotations: [],
    };
  }
}
