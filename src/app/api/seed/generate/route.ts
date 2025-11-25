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
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { getUserTier } from "@/lib/services/userService";
import { logger } from "@/lib/logger";

/**
 * Zod schema for input validation
 * Ensures profession is a non-empty string with reasonable length limits
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
    ),
});

type SeedGenerateRequest = z.infer<typeof SeedGenerateRequestSchema>;

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
    if (authError) {
      return authError;
    }

    // Parse and validate request body using Zod schema
    const payload = await safeParseBody(req);
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

    const tier = await getUserTier(userId!);
    const plan = SEEDING_PLAN_LIMITS[tier] ?? SEEDING_PLAN_LIMITS.basic;

    const userQuota = await consumeQuota({
      subjectId: userId!,
      scope: "seed_generate",
      limit: plan.monthlyWrites,
      period: "monthly",
    });

    if (plan.strategy === "template") {
      const resumeData = generateTemplateResume(profession);
      await logSeedGeneration({
        userId: userId!,
        profession,
        tier,
        strategy: plan.strategy,
      });

      const response = NextResponse.json(resumeData);
      attachQuotaHeaders(response, userQuota);
      return response;
    }

    const category = categorizeProfession(profession);
    const templateId = getTemplateIdForCategory(category);
    const prompt = buildPrompt(profession, templateId);

    const globalQuota = await consumeQuota({
      subjectId: "global_live_seed",
      scope: "seed_generate_live",
      limit: GLOBAL_LIVE_SEED_MONTHLY_LIMIT,
      period: "monthly",
    });

    const result = await generateText(prompt, 2000, 0.7);

    const cleanText = result.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const resumeData = JSON.parse(cleanText);

    await logSeedGeneration({
      userId: userId!,
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

    if (error instanceof SyntaxError) {
      return handleApiError(error, "Invalid JSON payload", 400);
    }

    return handleApiError(error, "Failed to generate resume", 500);
  }
}

// safeParseBody moved to @/lib/utils/api-helpers

function attachQuotaHeaders(
  response: NextResponse,
  quota: {
    limit: number;
    remaining: number;
    resetTime: number;
  }
) {
  response.headers.set("X-Seed-Quota-Limit", quota.limit.toString());
  response.headers.set("X-Seed-Quota-Remaining", quota.remaining.toString());
  response.headers.set(
    "X-Seed-Quota-Reset",
    Math.floor(quota.resetTime / 1000).toString()
  );
}
// ...existing code...

function buildPrompt(profession: string, templateId: string) {
  return `Generate a realistic, professional resume for a ${profession} with 5-8 years of experience. 
  
  IMPORTANT: Vary the structure based on the profession.
  - For Creative roles (Designer, Actor, Chef), emphasize "Projects" or "Portfolio" or "Credits".
  - For Technical roles (Engineer, Analyst), emphasize "Skills" and "Experience".
  - For Executive roles, emphasize "Summary" and "Leadership".

  Return ONLY a valid JSON object matching this structure (no markdown, no comments):
  {
    "title": "${profession}",
    "templateId": "${templateId}", // choose "modern-creative-v1" for creative, "executive-v1" for leadership, "standard-v1" otherwise
    "summary": "Professional summary...",
    "skills": [
      { "name": "Skill 1", "level": "Expert", "visibility": "public" },
      { "name": "Skill 2", "level": "Intermediate", "visibility": "public" }
    ],
    "experience": [
      {
        "company": "Company Name",
        "role": "Job Title",
        "startDate": "2020-01",
        "endDate": "Present",
        "description": "Detailed description of responsibilities and achievements...",
        "visibility": "public"
      }
    ],
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree Name",
        "startDate": "2015-09",
        "endDate": "2019-05",
        "description": "Major/Minor details",
        "visibility": "public"
      }
    ],
    "contact": {
      "email": { "value": "email@example.com", "visibility": "public" },
      "phone": { "value": "+1-555-0123", "visibility": "public" }
    },
    "projects": [
      {
        "name": "Project Name",
        "description": "Project description",
        "visibility": "public"
      }
    ]
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
