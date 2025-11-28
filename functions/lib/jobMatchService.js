"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJobMatchSuggestions = void 0;
exports.generateJobMatchingSuggestions = generateJobMatchingSuggestions;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const inference_1 = require("@huggingface/inference");
const generative_ai_1 = require("@google/generative-ai");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const crypto_1 = require("crypto");
const retryHandler_1 = require("./utils/retryHandler");
const config_1 = require("./config");
const validation_1 = require("./utils/validation");
const monitoring_1 = require("./utils/monitoring");
const rateLimiter_1 = require("./middleware/rateLimiter");
class RateLimitExceeded extends Error {
    constructor(retryAfter) {
        super("Too many requests");
        this.retryAfter = retryAfter;
        this.name = "RateLimitExceeded";
    }
}
const aiConfig = config_1.config.get("ai");
const securityConfig = config_1.config.get("security");
const rateLimitConfig = config_1.config.get("rateLimit");
const defaultModel = aiConfig.defaultModel || "gemini-1.5-flash";
const HUGGINGFACE_TOKEN = aiConfig.huggingfaceToken;
const GEMINI_API_KEY = aiConfig.geminiApiKey;
const hf = HUGGINGFACE_TOKEN ? new inference_1.HfInference(HUGGINGFACE_TOKEN) : null;
const genAI = GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY) : null;
// Circuit breakers for AI services
const huggingFaceCircuitBreaker = new retryHandler_1.CircuitBreaker(5, 60000, 2);
const geminiCircuitBreaker = new retryHandler_1.CircuitBreaker(5, 60000, 2);
// Retry options
const aiRetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: ["ECONNRESET", "ETIMEDOUT", "503", "429", "UNAVAILABLE"],
};
// SECURITY: CORS configuration from config (specific origins by default, not 'true')
const corsHandler = (0, cors_1.default)({ origin: securityConfig.corsOrigin });
// Helmet for security (can be toggled via config)
const helmetHandler = securityConfig.enableHelmet
    ? (0, helmet_1.default)({ contentSecurityPolicy: false })
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
const jobMatchRateLimit = Object.assign(Object.assign({}, rateLimiter_1.RateLimitPresets.JOB_MATCHING), { maxRequests: rateLimitConfig.jobMatchingPerHour ||
        rateLimiter_1.RateLimitPresets.JOB_MATCHING.maxRequests });
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fallback
const MAX_CACHE_ENTRIES = 250;
const tokenCache = new Map();
async function verifyIdTokenCached(token) {
    const cacheKey = (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    const cached = tokenCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return cached.decoded;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const expiresAt = Math.min(now + TOKEN_CACHE_TTL_MS, decoded.exp ? decoded.exp * 1000 : now + TOKEN_CACHE_TTL_MS);
    tokenCache.set(cacheKey, { decoded, expiresAt });
    if (tokenCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = tokenCache.keys().next().value;
        if (oldestKey) {
            tokenCache.delete(oldestKey);
        }
    }
    return decoded;
}
const normalize = (value) => value.trim().toLowerCase();
function extractKeywords(text) {
    const matches = text.toLowerCase().match(/[a-z0-9+#.\-]{3,}/g) || [];
    return Array.from(new Set(matches));
}
function deriveDeterministicInsights(jobDescription, resumeData) {
    const jobSkills = extractKeywords(jobDescription).filter((token) => token.length <= 40);
    const resumeSkills = new Set(resumeData.skills.map((skill) => normalize(skill)));
    const overlapSkills = jobSkills.filter((skill) => resumeSkills.has(skill));
    const missingSkills = jobSkills.filter((skill) => !resumeSkills.has(skill));
    const skillScore = jobSkills.length
        ? overlapSkills.length / jobSkills.length
        : 0.5;
    const experienceCorpus = resumeData.experience
        .map((exp) => `${exp.title} ${exp.description}`.toLowerCase())
        .join(" ");
    const experienceMatches = jobSkills.filter((skill) => experienceCorpus.includes(skill));
    const experienceScore = jobSkills.length
        ? experienceMatches.length / jobSkills.length
        : 0.5;
    const combinedScore = Math.max(0, Math.min(100, Math.round((skillScore * 0.6 + experienceScore * 0.4) * 100)));
    const recommendations = [];
    if (missingSkills.length > 0) {
        recommendations.push(`Highlight or build familiarity with: ${missingSkills
            .slice(0, 5)
            .join(", ")}`);
    }
    if (experienceScore < 0.6) {
        recommendations.push("Add measurable outcomes that mirror the responsibilities in the job description.");
    }
    if (skillScore < 0.5) {
        recommendations.push("Expand the skills section to cover the core stack mentioned by the employer.");
    }
    recommendations.push("Quantify recent achievements to make comparisons easier for recruiters.");
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
exports.generateJobMatchSuggestions = functions
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
                const suggestions = await monitoring_1.performanceMonitor.measure("functions.generateJobMatchSuggestions", async () => {
                    var _a, _b;
                    const { userId, jobDescription, resumeData, modelId = defaultModel, } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
                    const normalizedUserId = (0, validation_1.validateUserId)(userId);
                    const validatedDescription = (0, validation_1.validateJobDescription)(jobDescription);
                    const resumePayload = resumeData;
                    (0, validation_1.validateResumeData)(resumePayload);
                    const selectedModel = (0, validation_1.validateModelId)(modelId, ALLOWED_MODELS);
                    const authHeader = req.headers.authorization;
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
                        throw new functions.https.HttpsError("unauthenticated", "Missing bearer token");
                    }
                    const idToken = authHeader.split("Bearer ")[1].trim();
                    const decodedToken = await verifyIdTokenCached(idToken);
                    if (decodedToken.uid !== normalizedUserId) {
                        throw new functions.https.HttpsError("permission-denied", "Authenticated user mismatch");
                    }
                    functions.logger.info("Job match request accepted", {
                        userId: normalizedUserId,
                        modelId: selectedModel,
                        authProvider: (_b = decodedToken.firebase) === null || _b === void 0 ? void 0 : _b.sign_in_provider,
                    });
                    if (securityConfig.enableRateLimit) {
                        const limitResult = await (0, rateLimiter_1.checkRateLimit)(normalizedUserId, jobMatchRateLimit);
                        if (!limitResult.allowed) {
                            functions.logger.warn("Job match rate limit hit", {
                                userId: normalizedUserId,
                                retryAfter: limitResult.retryAfter,
                            });
                            throw new RateLimitExceeded(limitResult.retryAfter);
                        }
                    }
                    const suggestions = await generateJobMatchingSuggestions(validatedDescription, resumePayload, selectedModel);
                    return suggestions;
                }, monitoring_1.MetricType.FUNCTION_EXECUTION, { path: req.path || req.url });
                res.status(200).json({
                    success: true,
                    suggestions,
                });
            }
            catch (error) {
                const { status, payload } = await handleJobMatchError(error, req);
                res.status(status).json(payload);
            }
        });
    });
});
async function handleJobMatchError(error, req) {
    const requestId = req.headers["x-cloud-trace-context"] ||
        req.headers["x-request-id"];
    if (error instanceof RateLimitExceeded) {
        return {
            status: 429,
            payload: {
                error: "Too many requests",
                retryAfter: error.retryAfter,
            },
        };
    }
    if (error instanceof validation_1.ValidationError) {
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
    await monitoring_1.alertManager.sendAlert(monitoring_1.AlertSeverity.ERROR, "Job match suggestion failure", message, {
        requestId,
        path: req.path || req.url,
    });
    return {
        status: 500,
        payload: { error: "Failed to generate suggestions" },
    };
}
function mapHttpsCodeToStatus(code) {
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
async function generateJobMatchingSuggestions(jobDescription, resumeData, modelId) {
    return monitoring_1.performanceMonitor.measure("services.jobMatch.generate", async () => {
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
        const deterministicSummary = `Deterministic insights:\n- Skill overlap: ${insights.skillOverlapPercent}%\n- Missing skills: ${insights.missingSkills.slice(0, 5).join(", ") || "None"}`;
        return {
            analysis: `${aiAnalysis}\n\n${deterministicSummary}`.trim(),
            matchScore: insights.matchScore,
            recommendations: insights.recommendations,
        };
    }, monitoring_1.MetricType.AI_API_CALL, { modelId });
}
async function generateAiAnalysis(prompt, modelId) {
    try {
        if (modelId.startsWith("gemini") && genAI) {
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await (0, retryHandler_1.resilientCall)(async () => {
                const response = await model.generateContent(prompt);
                const generated = await response.response;
                return generated.text();
            }, {
                retryOptions: aiRetryOptions,
                circuitBreaker: geminiCircuitBreaker,
                timeoutMs: aiConfig.timeout || 30000,
                operationName: "job-match-gemini",
            });
            return generatedTextOrFallback(result);
        }
        if (hf && HUGGINGFACE_TOKEN) {
            const response = await (0, retryHandler_1.resilientCall)(async () => hf.textGeneration({
                model: modelId,
                inputs: prompt,
                parameters: {
                    max_new_tokens: modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
                    temperature: 0.6,
                },
            }), {
                retryOptions: aiRetryOptions,
                circuitBreaker: huggingFaceCircuitBreaker,
                timeoutMs: aiConfig.timeout || 30000,
                operationName: "job-match-huggingface",
            });
            return generatedTextOrFallback(response.generated_text);
        }
        throw new Error("No AI provider configured for job matching");
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        functions.logger.error("AI analysis failed", { message, modelId });
        await monitoring_1.alertManager.sendAlert(monitoring_1.AlertSeverity.WARNING, "Job match AI analysis fallback", message, { modelId });
        return "Unable to generate AI analysis at this time.";
    }
}
function generatedTextOrFallback(text) {
    if (!text) {
        return "Analysis generated";
    }
    return text.trim();
}
//# sourceMappingURL=jobMatchService.js.map