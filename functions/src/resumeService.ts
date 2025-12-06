import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
// Lazy loaded imports
// import { HfInference } from "@huggingface/inference";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import helmet from "helmet";
import {
  EnhancedResumeContent,
  ResumeData,
  GenerateResumeRequest,
} from "./types";
import {
  resilientCall,
  CircuitBreaker,
  RetryOptions,
} from "./utils/retryHandler";

import { config } from "./config";
import { checkRateLimit, type RateLimitConfig } from "./middleware/rateLimiter";

type SubscriptionTier = "basic" | "premium" | "enterprise";
type UsageWindow = "hour" | "day";

const db = admin.firestore();

// Initialize AI clients
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lazy load clients
let hf: any = null; // Type: HfInference
let genAI: any = null; // Type: GoogleGenerativeAI

async function getHfClient() {
  if (!hf) {
    const { HfInference } = await import("@huggingface/inference");
    hf = new HfInference(HUGGINGFACE_TOKEN);
  }
  return hf;
}

async function getGenAIClient() {
  if (!genAI && GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

// Circuit breakers for AI services
const geminiCircuitBreaker = new CircuitBreaker(5, 60000, 2);
const huggingFaceCircuitBreaker = new CircuitBreaker(5, 60000, 2);

// Retry options for AI calls
const aiRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "503", "429", "UNAVAILABLE"],
};

// SECURITY: CORS configuration from config (specific origins, not 'true')
const securityConfig = config.get<{ corsOrigin: string[] | boolean }>(
  "security"
);
const corsHandler = cors({ origin: securityConfig.corsOrigin });

// Helmet for security
const helmetHandler = helmet({
  contentSecurityPolicy: false,
});

const ALLOWED_MODELS = [
  "gpt2-medium",
  "gpt2",
  "google/flan-t5-base",
  "distilgpt2",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const TIER_MODEL_ALLOWLIST: Record<SubscriptionTier, string[]> = {
  basic: ["gemini-1.5-flash", "google/flan-t5-base", "distilgpt2"],
  premium: [
    "gemini-1.5-flash",
    "google/flan-t5-base",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "gpt2-medium",
    "distilgpt2",
  ],
  enterprise: ALLOWED_MODELS,
};

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
  userId: string
): Promise<SubscriptionTier> {
  try {
    const snapshot = await db.collection("users").doc(userId).get();
    const tier = snapshot.data()?.subscriptionTier;
    if (tier && TIER_MODEL_ALLOWLIST[tier as SubscriptionTier]) {
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
  tier: SubscriptionTier
): boolean {
  const normalized = modelId || "gemini-1.5-flash";
  const allowlist = TIER_MODEL_ALLOWLIST[tier] || [];
  return allowlist.includes(normalized);
}

async function enforceTierUsage(
  userId: string,
  tier: SubscriptionTier
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

function describeAllowedModels(tier: SubscriptionTier) {
  return TIER_MODEL_ALLOWLIST[tier].join(", ");
}

/**
 * Generate AI-powered resume content
 */
export const generateResumeContent = functions
  .runWith({
    secrets: [
      "HUGGINGFACE_TOKEN",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
    ],
  })
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      helmetHandler(req, res, async () => {
        if (req.method !== "POST") {
          res.status(405).json({ error: "Method not allowed" });
          return;
        }

        try {
          const {
            userId,
            resumeData,
            template = "modern",
            tone = "professional",
            modelId = "gemini-1.5-flash",
          } = req.body as GenerateResumeRequest;

          const normalizedModelId = modelId || "gemini-1.5-flash";

          if (!userId || !resumeData) {
            res.status(400).json({
              error: "Missing required fields: userId and resumeData",
            });
            return;
          }

          // Validate model selection
          if (
            normalizedModelId &&
            !ALLOWED_MODELS.includes(normalizedModelId)
          ) {
            res.status(400).json({
              error: `Invalid model: ${normalizedModelId}. Allowed models: ${ALLOWED_MODELS.join(
                ", "
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
                subscriptionTier
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

          // Generate enhanced resume content using AI
          const enhancedContent = await enhanceResumeWithAI(
            resumeData,
            tone,
            normalizedModelId
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
          console.error("Error generating resume content:", error);
          res.status(500).json({
            error: "Failed to generate resume content",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    });
  });

/**
 * Enhance resume with AI suggestions
 */
export async function enhanceResumeWithAI(
  resumeData: ResumeData,
  tone: string,
  modelId: string
): Promise<EnhancedResumeContent> {
  const startTime = Date.now();
  console.log("🤖 AI ENHANCEMENT STARTING", {
    modelId,
    tone,
    timestamp: new Date().toISOString(),
  });

  try {
    const prompt = createResumeEnhancementPrompt(resumeData, tone);
    const isGemini = modelId.startsWith("gemini-");
    const useGemini = isGemini && GEMINI_API_KEY;
    const useHuggingFace = !isGemini && HUGGINGFACE_TOKEN;
    const randomProvider = Math.random() < 0.5 ? "gemini" : "huggingface";

    let enhancedText = "";
    let actualProvider = "";

    if (useGemini || (randomProvider === "gemini" && GEMINI_API_KEY)) {
      actualProvider = "Google Gemini";
      const actualModel = modelId || "gemini-1.5-flash";
      console.log(`✨ Using ${actualProvider}: ${actualModel}`);
      console.log("📡 Calling Gemini API...");

      const client = await getGenAIClient();
      if (!client) throw new Error("Gemini client initialization failed");

      enhancedText = await resilientCall(
        async () => {
          const model = client.getGenerativeModel({
            model: actualModel,
          });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        },
        {
          retryOptions: aiRetryOptions,
          circuitBreaker: geminiCircuitBreaker,
          timeoutMs: 30000,
          operationName: "gemini-api-call",
        }
      );

      console.log("✅ Gemini API Response Received", {
        responseLength: enhancedText.length,
        duration: `${Date.now() - startTime}ms`,
      });
    } else if (useHuggingFace || HUGGINGFACE_TOKEN) {
      actualProvider = "Hugging Face";
      const actualModel = modelId || "mistralai/Mistral-7B-Instruct-v0.3";
      console.log(`✨ Using ${actualProvider}: ${actualModel}`);
      console.log("📡 Calling Hugging Face API...");

      const isMistral = actualModel === "mistralai/Mistral-7B-Instruct-v0.3";
      const client = await getHfClient();

      const response = await resilientCall(
        async () => {
          return client.textGeneration({
            model: actualModel,
            inputs: prompt,
            parameters: {
              max_new_tokens: isMistral ? 500 : 300,
              temperature: isMistral ? 0.6 : 0.7,
              do_sample: true,
              top_p: 0.9,
            },
          });
        },
        {
          retryOptions: aiRetryOptions,
          circuitBreaker: huggingFaceCircuitBreaker,
          timeoutMs: 30000,
          operationName: "huggingface-api-call",
        }
      );
      enhancedText = response.generated_text || "";

      console.log("✅ Hugging Face API Response Received", {
        responseLength: enhancedText.length,
        duration: `${Date.now() - startTime}ms`,
      });
    } else {
      throw new Error("No AI provider available");
    }

    console.log("🎯 AI Enhancement Complete", {
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
          enhancedText
        ),
      })),
      skillSuggestions: extractSkillSuggestions(enhancedText),
      improvementTips: extractImprovementTips(enhancedText),
    };
  } catch (error) {
    console.error("❌ AI enhancement failed:", error);
    console.error("💥 ERROR DETAILS", {
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
  tone: string
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
    line.toLowerCase().includes("summary")
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
  aiResponse?: string
): string {
  if (aiResponse) {
    const descMatch = aiResponse.match(
      /enhanced description[s]?:?\s*([^.!?\n]+)/i
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
    /(?:additional skills?|skills?):?\s*([^.!?]*)/i
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
