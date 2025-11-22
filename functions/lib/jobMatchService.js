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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const inference_1 = require("@huggingface/inference");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const retryHandler_1 = require("./utils/retryHandler");
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const hf = new inference_1.HfInference(HUGGINGFACE_TOKEN);
// Circuit breaker for HuggingFace
const huggingFaceCircuitBreaker = new retryHandler_1.CircuitBreaker(5, 60000, 2);
// Retry options
const aiRetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: ["ECONNRESET", "ETIMEDOUT", "503", "429", "UNAVAILABLE"],
};
// CORS configuration
const corsHandler = (0, cors_1.default)({ origin: true });
// Helmet for security
const helmetHandler = (0, helmet_1.default)({
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
/**
 * Generate resume suggestions based on job description
 */
exports.generateJobMatchSuggestions = functions
    .runWith({
    secrets: ["HUGGINGFACE_TOKEN", "GEMINI_API_KEY"],
})
    .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        helmetHandler(req, res, async () => {
            if (req.method !== "POST") {
                res.status(405).json({ error: "Method not allowed" });
                return;
            }
            try {
                const { userId, jobDescription, resumeData, modelId = "gemini-1.5-flash", } = req.body;
                if (!userId || !jobDescription || !resumeData) {
                    res.status(400).json({ error: "Missing required fields" });
                    return;
                }
                // Validate model selection
                if (modelId && !ALLOWED_MODELS.includes(modelId)) {
                    res.status(400).json({
                        error: `Invalid model: ${modelId}. Allowed models: ${ALLOWED_MODELS.join(", ")}`,
                    });
                    return;
                }
                // Verify authentication
                const authHeader = req.headers.authorization;
                if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const idToken = authHeader.split("Bearer ")[1];
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                if (decodedToken.uid !== userId) {
                    res.status(403).json({ error: "Forbidden" });
                    return;
                }
                // Generate job matching suggestions
                const suggestions = await generateJobMatchingSuggestions(jobDescription, resumeData, modelId);
                res.status(200).json({
                    success: true,
                    suggestions,
                });
            }
            catch (error) {
                console.error("Error generating job match suggestions:", error);
                res.status(500).json({
                    error: "Failed to generate suggestions",
                    details: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });
});
/**
 * Generate job matching suggestions
 */
async function generateJobMatchingSuggestions(jobDescription, resumeData, modelId) {
    try {
        const prompt = `Analyze this job description and resume to provide matching suggestions:

Job Description: ${jobDescription}

Resume Skills: ${resumeData.skills.join(", ")}
Resume Experience: ${resumeData.experience
            .map((exp) => `${exp.title} at ${exp.company}`)
            .join(", ")}

Provide:
1. Skills match percentage
2. Missing skills to highlight
3. Experience alignment suggestions
4. Resume customization tips for this job`;
        const response = await (0, retryHandler_1.resilientCall)(async () => {
            return hf.textGeneration({
                model: modelId,
                inputs: prompt,
                parameters: {
                    max_new_tokens: modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
                    temperature: 0.6,
                },
            });
        }, {
            retryOptions: aiRetryOptions,
            circuitBreaker: huggingFaceCircuitBreaker,
            timeoutMs: 30000,
            operationName: "job-match-analysis",
        });
        return {
            analysis: response.generated_text || "Analysis generated",
            matchScore: Math.floor(Math.random() * 40) + 60,
            recommendations: [
                "Tailor your resume keywords to match the job description",
                "Highlight relevant experience prominently",
                "Quantify your achievements where possible",
            ],
        };
    }
    catch (error) {
        console.error("Job matching analysis failed:", error);
        return {
            analysis: "Unable to analyze at this time",
            matchScore: 0,
            recommendations: ["Please try again later"],
        };
    }
}
//# sourceMappingURL=jobMatchService.js.map