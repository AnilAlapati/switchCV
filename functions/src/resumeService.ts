import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
// Lazy loaded imports
// import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import helmet from "helmet";
import { EnhancedResumeContent, ResumeData } from "./types";
import {
  resilientCall,
  CircuitBreaker,
  RetryOptions,
} from "./utils/retryHandler";
import { z } from "zod";
import { BillingService } from "./services/billingService";
import { BUDGET_CAPS } from "./lib/billing/shared";

const GenerateResumeSchema = z.object({
  userId: z.string().min(1),
  resumeData: z
    .object({
      summary: z.string(),
      experience: z.array(
        z
          .object({
            title: z.string(),
            company: z.string(),
            description: z.string(),
          })
          .passthrough(),
      ),
      skills: z.array(z.string()),
    })
    .passthrough(),
  template: z.string().optional().default("modern"),
  tone: z.string().optional().default("professional"),
  modelId: z.string().optional().default("gemini-1.5-flash"),
});

import { config } from "./config";
import { checkRateLimit, type RateLimitConfig } from "./middleware/rateLimiter";

type SubscriptionTier = "basic" | "premium" | "enterprise";
type UsageWindow = "hour" | "day";

const db = admin.firestore();

// Initialize AI clients
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lazy load clients
let genAI: any = null; // Type: GoogleGenerativeAI

async function getGenAIClient() {
  if (!genAI && GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

// Circuit breakers for AI services — one per model family for independent failure tracking
const geminiCircuitBreaker = new CircuitBreaker(5, 60000, 2);
const geminiProCircuitBreaker = new CircuitBreaker(5, 60000, 2);

// Map of model name → circuit breaker for fallback chain
const MODEL_CIRCUIT_BREAKERS: Record<string, CircuitBreaker> = {
  "gemini-1.5-flash": geminiCircuitBreaker,
  "gemini-2.0-flash": geminiCircuitBreaker,
  "gemini-2.5-flash": geminiCircuitBreaker,
  "gemini-2.5-flash-lite": geminiCircuitBreaker,
  "gemini-1.5-pro": geminiProCircuitBreaker,
  "gemini-2.5-pro": geminiProCircuitBreaker,
};

// Retry options for AI calls
const aiRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "503", "429", "UNAVAILABLE"],
};

// SECURITY: CORS configuration from config (specific origins, not 'true')
const securityConfig = config.get("security");
const corsHandler = cors({ origin: securityConfig.corsOrigin });

// Helmet for security
const helmetHandler = helmet({
  contentSecurityPolicy: false,
});

const ALLOWED_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

/**
 * Tier model PREFERENCES — determines the preferred order of models per tier.
 * This is NOT a hard limit. If all preferred models fail, the universal
 * fallback chain provides resilience for ALL tiers (including basic).
 */
const TIER_MODEL_PREFERENCES: Record<SubscriptionTier, string[]> = {
  basic: ["gemini-1.5-flash", "gemini-2.5-flash-lite"],
  premium: ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"],
  enterprise: ALLOWED_MODELS,
};

/**
 * Universal fallback chain — used when preferred models fail.
 * Ensures ALL tiers have resilience during outages.
 * Order: cheapest/fastest first, then more capable models.
 */
const UNIVERSAL_FALLBACK_CHAIN = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-pro",
];

const TIER_USAGE_LIMITS: Record<
  SubscriptionTier,
  Record<UsageWindow, RateLimitConfig>
> = {
  basic: {
    hour: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 2,
      keyPrefix: "ai_resume_basic_hour",
    },
    day: {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: "ai_resume_basic_day",
    },
  },
  premium: {
    hour: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: "ai_resume_premium_hour",
    },
    day: {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 40,
      keyPrefix: "ai_resume_premium_day",
    },
  },
  enterprise: {
    hour: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
      keyPrefix: "ai_resume_enterprise_hour",
    },
    day: {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 200,
      keyPrefix: "ai_resume_enterprise_day",
    },
  },
};

async function resolveSubscriptionTier(
  userId: string,
): Promise<SubscriptionTier> {
  try {
    const snapshot = await db.collection("users").doc(userId).get();
    const tier = snapshot.data()?.subscriptionTier;
    if (tier && TIER_MODEL_PREFERENCES[tier as SubscriptionTier]) {
      return tier as SubscriptionTier;
    }
  } catch (error) {
    functions.logger.error("Failed to resolve subscription tier", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return "basic";
}

function isModelAllowedForTier(
  modelId: string,
  tier: SubscriptionTier,
): boolean {
  const normalized = modelId || "gemini-1.5-flash";
  const preferences = TIER_MODEL_PREFERENCES[tier] || [];
  return preferences.includes(normalized);
}

async function enforceTierUsage(
  userId: string,
  tier: SubscriptionTier,
): Promise<{ allowed: boolean; window?: UsageWindow; retryAfter?: number }> {
  const limits = TIER_USAGE_LIMITS[tier];
  for (const window of Object.keys(limits) as UsageWindow[]) {
    const result = await checkRateLimit(userId, limits[window]);
    if (!result.allowed) {
      return { allowed: false, window, retryAfter: result.retryAfter };
    }
  }
  return { allowed: true };
}

function describeAllowedModels(tier: SubscriptionTier): string {
  return TIER_MODEL_PREFERENCES[tier].join(", ");
}

/**
 * Generate AI-powered resume content
 */
const generateResumeContentHandler = async (
  req: functions.https.Request,
  res: functions.Response,
) => {
  corsHandler(req, res, async () => {
    helmetHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const parseResult = GenerateResumeSchema.safeParse(req.body);

        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid request body",
            details: parseResult.error.issues,
          });
          return;
        }

        const { userId, resumeData, template, tone, modelId } =
          parseResult.data;

        const normalizedModelId = modelId;

        // Existing null checks are now redundant but kept for safety logic flow if needed,
        // though Zod handles most.
        if (!userId || !resumeData) {
          // specific logic
        }

        // Validate model selection
        if (normalizedModelId && !ALLOWED_MODELS.includes(normalizedModelId)) {
          res.status(400).json({
            error: `Invalid model: ${normalizedModelId}. Allowed models: ${ALLOWED_MODELS.join(
              ", ",
            )}`,
          });
          return;
        }

        // Verify user authentication
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch {
          res.status(401).json({ error: "Invalid token" });
          return;
        }

        if (decodedToken.uid !== userId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }

        const subscriptionTier = await resolveSubscriptionTier(userId);

        if (!isModelAllowedForTier(normalizedModelId, subscriptionTier)) {
          res.status(403).json({
            error: `Model ${normalizedModelId} is not available on the ${subscriptionTier} plan. Allowed models: ${describeAllowedModels(
              subscriptionTier,
            )}`,
          });
          return;
        }

        const usageResult = await enforceTierUsage(userId, subscriptionTier);
        if (!usageResult.allowed) {
          res.status(429).json({
            error:
              usageResult.window === "hour"
                ? "Hourly AI generation limit reached. Please wait before trying again."
                : "Daily AI generation limit reached. Upgrade your plan for higher limits.",
            retryAfter: usageResult.retryAfter,
            tier: subscriptionTier,
          });
          return;
        }

        // Budget enforcement: check system-wide and per-user caps before AI call
        const systemBudgetOk = await BillingService.checkSystemBudget(
          BUDGET_CAPS[subscriptionTier as keyof typeof BUDGET_CAPS] ??
            BUDGET_CAPS.basic,
        );
        if (!systemBudgetOk) {
          res.status(429).json({
            error:
              "System budget limit reached. AI generation is temporarily unavailable.",
          });
          return;
        }

        const userBudgetOk = await BillingService.checkBudget(
          userId,
          subscriptionTier as keyof typeof BUDGET_CAPS,
        );
        if (!userBudgetOk) {
          res.status(429).json({
            error:
              "Monthly budget limit reached for your plan. Upgrade for higher limits.",
            tier: subscriptionTier,
          });
          return;
        }

        // Generate enhanced resume content using AI
        const enhancedContent = await enhanceResumeWithAI(
          resumeData as unknown as ResumeData,
          tone,
          normalizedModelId,
          userId,
          subscriptionTier,
        );

        // Store the generated content
        await db.collection("users").doc(userId).collection("resumes").add({
          originalData: resumeData,
          enhancedContent,
          template,
          tone,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          version: "ai-enhanced-v1",
        });

        res.status(200).json({
          success: true,
          data: enhancedContent,
        });
      } catch (error) {
        functions.logger.error(
          { err: error instanceof Error ? error.message : "Unknown error" },
          "Error generating resume content",
        );
        res.status(500).json({
          error: "Failed to generate resume content. Please try again.",
        });
      }
    });
  });
};

export { generateResumeContentHandler };

export const generateResumeContent = functions
  .runWith({
    secrets: [
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
      "XAI_API_KEY",
    ],
  })
  .https.onRequest(generateResumeContentHandler);

import { runAgenticWorkflow } from "./agentOrchestrator";

/**
 * Enhance resume with AI suggestions
 */
export async function enhanceResumeWithAI(
  resumeData: ResumeData,
  tone: string,
  modelId: string,
  userId?: string,
  userTier?: string,
): Promise<EnhancedResumeContent> {
  const startTime = Date.now();
  functions.logger.info("🤖 AI ENHANCEMENT STARTING", {
    modelId,
    tone,
    timestamp: new Date().toISOString(),
  });

  try {
    const prompt = createResumeEnhancementPrompt(resumeData, tone);

    // Helper to execute AI calls (passed to orchestrator)
    const aiExecutor = async (
      promptText: string,
      specificModel: string,
    ): Promise<string> => {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required");
      }

      const client = await getGenAIClient();
      if (!client) throw new Error("Gemini client initialization failed");

      // Default to gemini-1.5-flash if a non-Gemini model is requested
      const actualModel = specificModel.startsWith("gemini-")
        ? specificModel
        : "gemini-1.5-flash";

      return resilientCall(
        async () => {
          const model = client.getGenerativeModel({ model: actualModel });
          const result = await model.generateContent(promptText);
          const response = await result.response;
          return response.text();
        },
        {
          retryOptions: aiRetryOptions,
          circuitBreaker: geminiCircuitBreaker,
          timeoutMs: 30000,
          operationName: "gemini-api-call-agentic",
        },
      );
    };

    let enhancedText = "";
    let actualProvider = "";

    // 1. Try Agentic Workflow first if user details provided
    if (userId && userTier) {
      const agenticResult = await runAgenticWorkflow(
        userId,
        userTier,
        {
          userResume: JSON.stringify(resumeData),
          instructions: `Tone: ${tone}`,
        },
        aiExecutor,
      );

      if (agenticResult) {
        enhancedText = agenticResult;
        functions.logger.info("🚀 Agentic Workflow Execution Successful");
        actualProvider = "Agentic Workflow";
      }
    }

    // 2. If Agentic didn't run or returned null (fallback), use Standard Flow with Fallback Chain
    if (!enhancedText) {
      if (!GEMINI_API_KEY) {
        throw new Error("No AI provider available - GEMINI_API_KEY required");
      }

      // Build fallback chain: preferred models for tier first, then universal fallbacks
      const preferred =
        TIER_MODEL_PREFERENCES[userTier as SubscriptionTier] ||
        TIER_MODEL_PREFERENCES.basic;
      const requestedModel = modelId.startsWith("gemini-")
        ? modelId
        : "gemini-1.5-flash";

      // Put the requested model first, then tier preferences, then universal fallbacks
      const fallbackChain = [
        requestedModel,
        ...preferred.filter((m) => m !== requestedModel),
        ...UNIVERSAL_FALLBACK_CHAIN.filter(
          (m) => m !== requestedModel && !preferred.includes(m),
        ),
      ];

      let lastError: unknown = null;

      for (const candidateModel of fallbackChain) {
        // Skip models whose circuit breaker is open
        const breaker =
          MODEL_CIRCUIT_BREAKERS[candidateModel] || geminiCircuitBreaker;

        try {
          functions.logger.info(
            { model: candidateModel, tier: userTier },
            "Attempting AI generation with model",
          );

          const client = await getGenAIClient();
          if (!client) throw new Error("Gemini client initialization failed");

          enhancedText = await resilientCall(
            async () => {
              const model = client.getGenerativeModel({
                model: candidateModel,
              });
              const result = await model.generateContent(prompt);
              const response = await result.response;
              return response.text();
            },
            {
              retryOptions: aiRetryOptions,
              circuitBreaker: breaker,
              timeoutMs: 30000,
              operationName: `gemini-api-call-${candidateModel}`,
            },
          );

          actualProvider = `Google Gemini (${candidateModel})`;
          functions.logger.info(
            {
              model: candidateModel,
              responseLength: enhancedText.length,
              duration: `${Date.now() - startTime}ms`,
            },
            "AI generation succeeded",
          );
          break; // Success — exit fallback loop
        } catch (modelError) {
          lastError = modelError;
          functions.logger.warn(
            {
              model: candidateModel,
              error:
                modelError instanceof Error
                  ? modelError.message
                  : String(modelError),
              tier: userTier,
            },
            "Model failed, trying next in fallback chain",
          );
          // Continue to next model in chain
        }
      }

      // All models in fallback chain exhausted
      if (!enhancedText) {
        functions.logger.error(
          {
            fallbackChain,
            tier: userTier,
            lastError:
              lastError instanceof Error
                ? lastError.message
                : String(lastError),
          },
          "All AI models in fallback chain failed",
        );
        throw new Error(
          "All AI models are currently unavailable. Please try again later.",
        );
      }
    }

    functions.logger.info("🎯 AI Enhancement Complete", {
      provider: actualProvider,
      totalDuration: `${Date.now() - startTime}ms`,
      success: true,
    });

    return {
      enhancedSummary: enhanceSummary(resumeData.summary, enhancedText),
      enhancedExperience: resumeData.experience.map((exp) => ({
        ...exp,
        enhancedDescription: enhanceExperienceDescription(
          exp.description,
          enhancedText,
        ),
      })),
      skillSuggestions: extractSkillSuggestions(enhancedText),
      improvementTips: extractImprovementTips(enhancedText),
    };
  } catch (error) {
    functions.logger.error("❌ AI enhancement failed:", error);
    functions.logger.error("💥 ERROR DETAILS", {
      error: error instanceof Error ? error.message : "Unknown error",
      modelId,
      timestamp: new Date().toISOString(),
    });

    return {
      enhancedSummary: resumeData.summary,
      enhancedExperience: resumeData.experience.map((exp) => ({
        ...exp,
        enhancedDescription: exp.description,
      })),
      skillSuggestions: [],
      improvementTips: ["Consider adding more quantifiable achievements"],
    };
  }
}

/**
 * Create resume enhancement prompt
 */
function createResumeEnhancementPrompt(
  resumeData: ResumeData,
  tone: string,
): string {
  return `You are an expert resume writer. Enhance the following resume content to make it more compelling and professional.

Current Summary: ${resumeData.summary}

Experience:
${resumeData.experience
  .map((exp) => `- ${exp.title} at ${exp.company}: ${exp.description}`)
  .join("\n")}

Skills: ${resumeData.skills.join(", ")}

Tone preference: ${tone}

Please provide:
1. An enhanced professional summary
2. Improved descriptions for each experience
3. Additional skills that would complement this profile
4. Tips for improvement

Make the content more impactful with quantifiable achievements and strong action verbs.`;
}

/**
 * Enhance summary with AI response
 */
function enhanceSummary(originalSummary: string, aiResponse: string): string {
  const lines = aiResponse.split("\n");
  const summaryLine = lines.find((line) =>
    line.toLowerCase().includes("summary"),
  );
  return summaryLine
    ? summaryLine.replace(/^(enhanced summary|summary):/i, "").trim()
    : originalSummary;
}

/**
 * Enhance experience description with AI response
 */
function enhanceExperienceDescription(
  originalDesc: string,
  aiResponse?: string,
): string {
  if (aiResponse) {
    const descMatch = aiResponse.match(
      /enhanced description[s]?:?\s*([^.!?\n]+)/i,
    );
    if (descMatch) {
      return descMatch[1].trim();
    }
  }
  return originalDesc;
}

/**
 * Extract skill suggestions from AI response
 */
function extractSkillSuggestions(aiResponse: string): string[] {
  const skillMatches = aiResponse.match(
    /(?:additional skills?|skills?):?\s*([^.!?]*)/i,
  );
  if (skillMatches) {
    return skillMatches[1]
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }
  return [];
}

/**
 * Extract improvement tips from AI response
 */
function extractImprovementTips(aiResponse: string): string[] {
  const tipMatches = aiResponse.match(/(?:tips?|improvements?):?\s*([^.!?]*)/i);
  if (tipMatches) {
    return tipMatches[1]
      .split(",")
      .map((tip) => tip.trim())
      .filter((tip) => tip.length > 0);
  }
  return ["Focus on quantifiable achievements", "Use strong action verbs"];
}
