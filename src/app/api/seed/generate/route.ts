/**
 * Seed Generate API Route
 *
 * Generates resume data based on a profession using either template-based
 * generation (for basic tier) or AI-powered generation (for premium tiers).
 *
 * Key Features:
 * - Quota management with refund on failure
 * - AI response validation using Zod schemas
 * - Prompt injection protection
 * - Robust JSON extraction from AI responses
 *
 * @see /docs/features/SEED_GENERATE_IMPROVEMENTS.md for full documentation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import admin, { adminDb } from "@/lib/firebase-admin";
import { generateText } from "@/lib/services/aiGenerationService";
import {
  ENABLE_SEEDING_AND_DEBUG_LISTS,
  GLOBAL_LIVE_SEED_MONTHLY_LIMIT,
  SEEDING_PLAN_LIMITS,
  SeedStrategy,
  SubscriptionTier,
} from "@/lib/config";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import {
  categorizeProfession,
  generateTemplateResume,
  getTemplateIdForCategory,
} from "@/lib/services/resumeSeedGenerator";
import {
  consumeQuota,
  QuotaExceededError,
  refundQuota,
} from "@/lib/services/quotaService";
import { getUserTier } from "@/lib/services/userService";
import { logger } from "@/lib/logger";
import {
  containsPromptInjection,
  sanitizeForPrompt,
} from "@/lib/utils/promptSafety";
import { extractJsonFromResponse } from "@/lib/utils/aiResponseParser";
import {
  AIResumeResponseSchema,
  type AIResumeResponse,
} from "@/lib/schemas/aiResumeSchema";

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Request body schema with prompt injection protection
 */
const SeedGenerateRequestSchema = z.object({
  profession: z
    .string()
    .min(1, "Profession is required")
    .max(100, "Profession must be 100 characters or less")
    .trim()
    .refine(
      (val) => /^[a-zA-Z\s\-']+$/.test(val),
      "Profession must contain only letters, spaces, hyphens, and apostrophes"
    )
    .refine(
      (val) => !containsPromptInjection(val),
      "Invalid characters detected in profession"
    ),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  if (!ENABLE_SEEDING_AND_DEBUG_LISTS) {
    return handleApiError(
      null,
      "Seeding functionality is currently disabled",
      403
    );
  }

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    if (authError || !userId) {
      return authError ?? handleApiError(null, "Authentication required", 401);
    }

    // Parse and validate request body
    let payload;
    try {
      payload = await safeParseBody(req);
    } catch (e) {
      return handleApiError(e, "Invalid JSON in request body", 400);
    }

    const validationResult = SeedGenerateRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e: z.ZodIssue) => e.message)
        .join(", ");
      logger.warn(
        { userId, errors: validationResult.error.issues },
        "Invalid seed generate request"
      );
      return handleApiError(null, errorMessage, 400);
    }

    const { profession } = validationResult.data;
    const safeProfession = sanitizeForPrompt(profession);

    const tier = await getUserTier(userId);
    const plan = SEEDING_PLAN_LIMITS[tier] ?? SEEDING_PLAN_LIMITS.basic;

    // Consume user quota
    const userQuota = await consumeQuota({
      subjectId: userId,
      scope: "seed_generate",
      limit: plan.monthlyWrites,
      period: "monthly",
    });

    // Template-based generation (no AI)
    if (plan.strategy === "template") {
      const resumeData = generateTemplateResume(safeProfession);
      await logSeedGeneration({
        userId,
        profession: safeProfession,
        tier,
        strategy: plan.strategy,
      });

      const response = NextResponse.json(resumeData);
      attachQuotaHeaders(response, userQuota);
      return response;
    }

    // AI-powered generation
    return await handleAIGeneration({
      userId,
      profession: safeProfession,
      tier,
      plan,
      userQuota,
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const retryAfter = error.resetTime
        ? Math.max(1, Math.ceil((error.resetTime - Date.now()) / 1000))
        : undefined;
      const response = handleApiError(error, error.message, 429);
      if (retryAfter) {
        response.headers.set("Retry-After", retryAfter.toString());
      }
      return response;
    }

    return handleApiError(error, "Failed to generate resume", 500);
  }
}

// ============================================================================
// AI GENERATION HANDLER
// ============================================================================

interface AIGenerationParams {
  userId: string;
  profession: string;
  tier: SubscriptionTier;
  plan: (typeof SEEDING_PLAN_LIMITS)[SubscriptionTier];
  userQuota: { limit: number; remaining: number; resetTime: number };
}

async function handleAIGeneration(params: AIGenerationParams) {
  const { userId, profession, tier, plan, userQuota } = params;

  const category = categorizeProfession(profession);
  const templateId = getTemplateIdForCategory(category);
  const prompt = buildPrompt(profession, templateId);

  // AI generation constants
  const AI_MAX_TOKENS = 2000;
  const AI_TEMPERATURE = 0.7;

  // Consume global quota for AI calls
  const globalQuota = await consumeQuota({
    subjectId: "global_live_seed",
    scope: "seed_generate_live",
    limit: GLOBAL_LIVE_SEED_MONTHLY_LIMIT,
    period: "monthly",
  });

  let result;
  try {
    result = await generateText(prompt, AI_MAX_TOKENS, AI_TEMPERATURE);
  } catch (aiError) {
    // Refund quota on AI failure
    await refundQuotas(userId);
    logger.error({ error: aiError }, "AI generation failed, quota refunded");
    throw aiError;
  }

  // Parse and validate AI response
  let resumeData: AIResumeResponse;
  try {
    const parsed = extractJsonFromResponse(result.text);
    if (!parsed) {
      throw new Error("No valid JSON found in AI response");
    }

    const validated = AIResumeResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.error(
        { errors: validated.error.issues, rawText: result.text.slice(0, 500) },
        "AI response failed schema validation"
      );
      throw new Error(
        `Invalid resume structure: ${validated.error.issues
          .map((i) => i.message)
          .join(", ")}`
      );
    }
    resumeData = validated.data;
  } catch (parseError) {
    // Refund quota on parse failure
    await refundQuotas(userId);
    logger.error(
      { error: parseError, rawText: result.text.slice(0, 500) },
      "AI returned invalid response, quota refunded"
    );
    return handleApiError(
      null,
      "AI service returned an invalid response. Please try again.",
      502
    );
  }

  await logSeedGeneration({
    userId,
    profession,
    tier,
    strategy: plan.strategy,
    provider: result.provider,
    model: result.model,
  });

  const response = NextResponse.json(resumeData);
  attachQuotaHeaders(response, userQuota);
  response.headers.set(
    "X-Seed-Global-Remaining",
    globalQuota.remaining.toString()
  );
  return response;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function refundQuotas(userId: string) {
  await Promise.all([
    refundQuota({
      subjectId: userId,
      scope: "seed_generate",
      period: "monthly",
    }),
    refundQuota({
      subjectId: "global_live_seed",
      scope: "seed_generate_live",
      period: "monthly",
    }),
  ]);
}

function attachQuotaHeaders(
  response: NextResponse,
  quota: { limit: number; remaining: number; resetTime: number }
) {
  response.headers.set("X-Seed-Quota-Limit", quota.limit.toString());
  response.headers.set("X-Seed-Quota-Remaining", quota.remaining.toString());
  response.headers.set(
    "X-Seed-Quota-Reset",
    Math.floor(quota.resetTime / 1000).toString()
  );
}

function buildPrompt(profession: string, templateId: string) {
  return `Generate a realistic, professional resume for a ${profession} with 5-8 years of experience. 
  
IMPORTANT: Vary the structure based on the profession.
- For Creative roles (Designer, Actor, Chef), emphasize "Projects" or "Portfolio".
- For Technical roles (Engineer, Analyst), emphasize "Skills" and "Experience".
- For Executive roles, emphasize "Summary" and "Leadership".

Return ONLY a valid JSON object matching this structure (no markdown, no comments):
{
  "title": "${profession}",
  "templateId": "${templateId}",
  "summary": "Professional summary...",
  "skills": [{ "name": "Skill 1", "level": "Expert", "visibility": "public" }],
  "experience": [{
    "company": "Company Name", "role": "Job Title",
    "startDate": "2020-01", "endDate": "Present",
    "description": "Detailed description...", "visibility": "public"
  }],
  "education": [{
    "institution": "University", "degree": "Degree",
    "startDate": "2015-09", "endDate": "2019-05",
    "description": "Major details", "visibility": "public"
  }],
  "contact": {
    "email": { "value": "email@example.com", "visibility": "public" },
    "phone": { "value": "+1-555-0123", "visibility": "public" }
  },
  "projects": [{ "name": "Project", "description": "Description", "visibility": "public" }]
}`;
}

async function logSeedGeneration(params: {
  userId: string;
  profession: string;
  tier: SubscriptionTier;
  strategy: SeedStrategy;
  provider?: string;
  model?: string;
}) {
  await adminDb.collection("seedGenerationLogs").add({
    userId: params.userId,
    profession: params.profession,
    tier: params.tier,
    strategy: params.strategy,
    provider: params.provider || "template",
    model: params.model || "template",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
