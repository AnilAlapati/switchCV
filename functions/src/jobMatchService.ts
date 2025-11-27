import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { HfInference } from "@huggingface/inference";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import helmet from "helmet";
import type { RequestHandler } from "express";
import { createHash } from "crypto";
import { JobMatchSuggestions, ResumeData } from "./types";
import {
  resilientCall,
  CircuitBreaker,
  RetryOptions,
} from "./utils/retryHandler";
import { config } from "./config";
import {
  validateJobDescription,
  validateModelId,
  validateResumeData,
  validateUserId,
  ValidationError,
} from "./utils/validation";
import {
  AlertSeverity,
  MetricType,
  alertManager,
  performanceMonitor,
} from "./utils/monitoring";
import { RateLimitPresets, checkRateLimit } from "./middleware/rateLimiter";

class RateLimitExceeded extends Error {
  constructor(public readonly retryAfter?: number) {
    super("Too many requests");
    this.name = "RateLimitExceeded";
  }
}

const aiConfig = config.get("ai");
const securityConfig = config.get("security");
const rateLimitConfig = config.get("rateLimit");
const defaultModel = aiConfig.defaultModel || "gemini-1.5-flash";

const HUGGINGFACE_TOKEN = aiConfig.huggingfaceToken;
const GEMINI_API_KEY = aiConfig.geminiApiKey;
const hf = HUGGINGFACE_TOKEN ? new HfInference(HUGGINGFACE_TOKEN) : null;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Circuit breakers for AI services
const huggingFaceCircuitBreaker = new CircuitBreaker(5, 60000, 2);
const geminiCircuitBreaker = new CircuitBreaker(5, 60000, 2);

// Retry options
const aiRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "503", "429", "UNAVAILABLE"],
};

// CORS configuration
const corsHandler = cors({ origin: securityConfig.corsOrigin ?? true });

// Helmet for security (can be toggled via config)
const helmetHandler: RequestHandler = securityConfig.enableHelmet
  ? helmet({ contentSecurityPolicy: false })
  : (_req, _res, next) => next();

const ALLOWED_MODELS = [
  "gpt2-medium",
  "gpt2",
  "google/flan-t5-base",
  "distilgpt2",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const jobMatchRateLimit = {
  ...RateLimitPresets.JOB_MATCHING,
  maxRequests:
    rateLimitConfig.jobMatchingPerHour ||
    RateLimitPresets.JOB_MATCHING.maxRequests,
};

type CachedToken = {
  decoded: admin.auth.DecodedIdToken;
  expiresAt: number;
};

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fallback
const MAX_CACHE_ENTRIES = 250;
const tokenCache = new Map<string, CachedToken>();

async function verifyIdTokenCached(
  token: string
): Promise<admin.auth.DecodedIdToken> {
  const cacheKey = createHash("sha256").update(token).digest("hex");
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.decoded;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  const expiresAt = Math.min(
    now + TOKEN_CACHE_TTL_MS,
    decoded.exp ? decoded.exp * 1000 : now + TOKEN_CACHE_TTL_MS
  );

  tokenCache.set(cacheKey, { decoded, expiresAt });
  if (tokenCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey) {
      tokenCache.delete(oldestKey);
    }
  }

  return decoded;
}

const normalize = (value: string): string => value.trim().toLowerCase();

function extractKeywords(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9+#.\-]{3,}/g) || [];
  return Array.from(new Set(matches));
}

function deriveDeterministicInsights(
  jobDescription: string,
  resumeData: ResumeData
): {
  matchScore: number;
  missingSkills: string[];
  overlapSkills: string[];
  recommendations: string[];
  skillOverlapPercent: number;
} {
  const jobSkills = extractKeywords(jobDescription).filter(
    (token) => token.length <= 40
  );
  const resumeSkills = new Set(
    resumeData.skills.map((skill) => normalize(skill))
  );
  const overlapSkills = jobSkills.filter((skill) => resumeSkills.has(skill));
  const missingSkills = jobSkills.filter((skill) => !resumeSkills.has(skill));

  const skillScore = jobSkills.length
    ? overlapSkills.length / jobSkills.length
    : 0.5;

  const experienceCorpus = resumeData.experience
    .map((exp) => `${exp.title} ${exp.description}`.toLowerCase())
    .join(" ");
  const experienceMatches = jobSkills.filter((skill) =>
    experienceCorpus.includes(skill)
  );
  const experienceScore = jobSkills.length
    ? experienceMatches.length / jobSkills.length
    : 0.5;

  const combinedScore = Math.max(
    0,
    Math.min(100, Math.round((skillScore * 0.6 + experienceScore * 0.4) * 100))
  );

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Highlight or build familiarity with: ${missingSkills
        .slice(0, 5)
        .join(", ")}`
    );
  }
  if (experienceScore < 0.6) {
    recommendations.push(
      "Add measurable outcomes that mirror the responsibilities in the job description."
    );
  }
  if (skillScore < 0.5) {
    recommendations.push(
      "Expand the skills section to cover the core stack mentioned by the employer."
    );
  }
  recommendations.push(
    "Quantify recent achievements to make comparisons easier for recruiters."
  );

  return {
    matchScore: combinedScore,
    missingSkills,
    overlapSkills,
    recommendations: Array.from(new Set(recommendations)).slice(0, 4),
    skillOverlapPercent: Math.round(skillScore * 100),
  };
}

/**
 * Generate resume suggestions based on job description
 */
export const generateJobMatchSuggestions = functions
  .runWith({
    secrets: [
      "HUGGINGFACE_TOKEN",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
    ],
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      helmetHandler(req, res, async () => {
        if (req.method !== "POST") {
          res.status(405).json({ error: "Method not allowed" });
          return;
        }

        try {
          const suggestions = await performanceMonitor.measure(
            "functions.generateJobMatchSuggestions",
            async () => {
              const {
                userId,
                jobDescription,
                resumeData,
                modelId = defaultModel,
              } = req.body ?? {};

              const normalizedUserId = validateUserId(userId);
              const validatedDescription =
                validateJobDescription(jobDescription);
              const resumePayload = resumeData as ResumeData;
              validateResumeData(resumePayload);
              const selectedModel = validateModelId(modelId, ALLOWED_MODELS);

              const authHeader = req.headers.authorization;
              if (!authHeader?.startsWith("Bearer ")) {
                throw new functions.https.HttpsError(
                  "unauthenticated",
                  "Missing bearer token"
                );
              }

              const idToken = authHeader.split("Bearer ")[1].trim();
              const decodedToken = await verifyIdTokenCached(idToken);

              if (decodedToken.uid !== normalizedUserId) {
                throw new functions.https.HttpsError(
                  "permission-denied",
                  "Authenticated user mismatch"
                );
              }

              functions.logger.info("Job match request accepted", {
                userId: normalizedUserId,
                modelId: selectedModel,
                authProvider: decodedToken.firebase?.sign_in_provider,
              });

              if (securityConfig.enableRateLimit) {
                const limitResult = await checkRateLimit(
                  normalizedUserId,
                  jobMatchRateLimit
                );
                if (!limitResult.allowed) {
                  functions.logger.warn("Job match rate limit hit", {
                    userId: normalizedUserId,
                    retryAfter: limitResult.retryAfter,
                  });
                  throw new RateLimitExceeded(limitResult.retryAfter);
                }
              }

              const suggestions = await generateJobMatchingSuggestions(
                validatedDescription,
                resumePayload,
                selectedModel
              );

              return suggestions;
            },
            MetricType.FUNCTION_EXECUTION,
            { path: req.path || req.url }
          );

          res.status(200).json({
            success: true,
            suggestions,
          });
        } catch (error) {
          const { status, payload } = await handleJobMatchError(error, req);
          res.status(status).json(payload);
        }
      });
    });
  });

async function handleJobMatchError(
  error: unknown,
  req: functions.https.Request
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const requestId =
    (req.headers["x-cloud-trace-context"] as string) ||
    (req.headers["x-request-id"] as string);

  if (error instanceof RateLimitExceeded) {
    return {
      status: 429,
      payload: {
        error: "Too many requests",
        retryAfter: error.retryAfter,
      },
    };
  }

  if (error instanceof ValidationError) {
    return {
      status: 400,
      payload: { error: error.message, field: error.field },
    };
  }

  if (error instanceof functions.https.HttpsError) {
    const status = mapHttpsCodeToStatus(error.code);
    return {
      status,
      payload: { error: error.message, code: error.code },
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  functions.logger.error("Job match suggestions failed", {
    error: message,
    requestId,
  });

  await alertManager.sendAlert(
    AlertSeverity.ERROR,
    "Job match suggestion failure",
    message,
    {
      requestId,
      path: req.path || req.url,
    }
  );

  return {
    status: 500,
    payload: { error: "Failed to generate suggestions" },
  };
}

function mapHttpsCodeToStatus(
  code: functions.https.FunctionsErrorCode
): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "permission-denied":
      return 403;
    case "invalid-argument":
      return 400;
    case "resource-exhausted":
      return 429;
    default:
      return 500;
  }
}

/**
 * Generate job matching suggestions with monitoring and deterministic scoring
 */
export async function generateJobMatchingSuggestions(
  jobDescription: string,
  resumeData: ResumeData,
  modelId: string
): Promise<JobMatchSuggestions> {
  return performanceMonitor.measure(
    "services.jobMatch.generate",
    async () => {
      const prompt = `Analyze this job description and resume to provide matching suggestions.

Job Description:
${jobDescription}

Resume Skills: ${resumeData.skills.join(", ")}
Resume Experience: ${resumeData.experience
        .map((exp) => `${exp.title} at ${exp.company}`)
        .join(", ")}

Provide:
1. Skills match percentage
2. Missing skills to highlight
3. Experience alignment suggestions
4. Resume customization tips for this job`;

      const aiAnalysis = await generateAiAnalysis(prompt, modelId);
      const insights = deriveDeterministicInsights(jobDescription, resumeData);

      const deterministicSummary = `Deterministic insights:\n- Skill overlap: ${
        insights.skillOverlapPercent
      }%\n- Missing skills: ${
        insights.missingSkills.slice(0, 5).join(", ") || "None"
      }`;

      return {
        analysis: `${aiAnalysis}\n\n${deterministicSummary}`.trim(),
        matchScore: insights.matchScore,
        recommendations: insights.recommendations,
      };
    },
    MetricType.AI_API_CALL,
    { modelId }
  );
}

async function generateAiAnalysis(
  prompt: string,
  modelId: string
): Promise<string> {
  try {
    if (modelId.startsWith("gemini") && genAI) {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await resilientCall(
        async () => {
          const response = await model.generateContent(prompt);
          const generated = await response.response;
          return generated.text();
        },
        {
          retryOptions: aiRetryOptions,
          circuitBreaker: geminiCircuitBreaker,
          timeoutMs: aiConfig.timeout || 30000,
          operationName: "job-match-gemini",
        }
      );
      return generatedTextOrFallback(result);
    }

    if (hf && HUGGINGFACE_TOKEN) {
      const response = await resilientCall(
        async () =>
          hf.textGeneration({
            model: modelId,
            inputs: prompt,
            parameters: {
              max_new_tokens:
                modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
              temperature: 0.6,
            },
          }),
        {
          retryOptions: aiRetryOptions,
          circuitBreaker: huggingFaceCircuitBreaker,
          timeoutMs: aiConfig.timeout || 30000,
          operationName: "job-match-huggingface",
        }
      );
      return generatedTextOrFallback(response.generated_text);
    }

    throw new Error("No AI provider configured for job matching");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    functions.logger.error("AI analysis failed", { message, modelId });
    await alertManager.sendAlert(
      AlertSeverity.WARNING,
      "Job match AI analysis fallback",
      message,
      { modelId }
    );
    return "Unable to generate AI analysis at this time.";
  }
}

function generatedTextOrFallback(text?: string): string {
  if (!text) {
    return "Analysis generated";
  }
  return text.trim();
}
