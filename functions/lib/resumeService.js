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
exports.generateResumeContent = void 0;
exports.enhanceResumeWithAI = enhanceResumeWithAI;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const inference_1 = require("@huggingface/inference");
const generative_ai_1 = require("@google/generative-ai");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// Initialize AI clients
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const hf = new inference_1.HfInference(HUGGINGFACE_TOKEN);
const genAI = GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY) : null;
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
 * Generate AI-powered resume content
 */
exports.generateResumeContent = functions
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
                const { userId, resumeData, template = "modern", tone = "professional", modelId = "gemini-1.5-flash", } = req.body;
                if (!userId || !resumeData) {
                    res.status(400).json({
                        error: "Missing required fields: userId and resumeData",
                    });
                    return;
                }
                // Validate model selection
                if (modelId && !ALLOWED_MODELS.includes(modelId)) {
                    res.status(400).json({
                        error: `Invalid model: ${modelId}. Allowed models: ${ALLOWED_MODELS.join(", ")}`,
                    });
                    return;
                }
                // Verify user authentication
                const authHeader = req.headers.authorization;
                if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const idToken = authHeader.split("Bearer ")[1];
                let decodedToken;
                try {
                    decodedToken = await admin.auth().verifyIdToken(idToken);
                }
                catch (_a) {
                    res.status(401).json({ error: "Invalid token" });
                    return;
                }
                if (decodedToken.uid !== userId) {
                    res.status(403).json({ error: "Forbidden" });
                    return;
                }
                // Generate enhanced resume content using AI
                const enhancedContent = await enhanceResumeWithAI(resumeData, tone, modelId);
                // Store the generated content
                const db = admin.firestore();
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
            }
            catch (error) {
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
async function enhanceResumeWithAI(resumeData, tone, modelId) {
    const startTime = Date.now();
    console.log("🤖 AI ENHANCEMENT STARTING", {
        modelId,
        tone,
        timestamp: new Date().toISOString(),
    });
    try {
        const prompt = createResumeEnhancementPrompt(resumeData, tone);
        const isGemini = modelId.startsWith("gemini-");
        const useGemini = isGemini && genAI;
        const useHuggingFace = !isGemini && HUGGINGFACE_TOKEN;
        const randomProvider = Math.random() < 0.5 ? "gemini" : "huggingface";
        let enhancedText = "";
        let actualProvider = "";
        if (useGemini || (randomProvider === "gemini" && genAI)) {
            actualProvider = "Google Gemini";
            const actualModel = modelId || "gemini-1.5-flash";
            console.log(`✨ Using ${actualProvider}: ${actualModel}`);
            console.log("📡 Calling Gemini API...");
            const model = genAI.getGenerativeModel({
                model: actualModel,
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            enhancedText = response.text();
            console.log("✅ Gemini API Response Received", {
                responseLength: enhancedText.length,
                duration: `${Date.now() - startTime}ms`,
            });
        }
        else if (useHuggingFace || HUGGINGFACE_TOKEN) {
            actualProvider = "Hugging Face";
            const actualModel = modelId || "mistralai/Mistral-7B-Instruct-v0.3";
            console.log(`✨ Using ${actualProvider}: ${actualModel}`);
            console.log("📡 Calling Hugging Face API...");
            const isMistral = actualModel === "mistralai/Mistral-7B-Instruct-v0.3";
            const response = await hf.textGeneration({
                model: actualModel,
                inputs: prompt,
                parameters: {
                    max_new_tokens: isMistral ? 500 : 300,
                    temperature: isMistral ? 0.6 : 0.7,
                    do_sample: true,
                    top_p: 0.9,
                },
            });
            enhancedText = response.generated_text || "";
            console.log("✅ Hugging Face API Response Received", {
                responseLength: enhancedText.length,
                duration: `${Date.now() - startTime}ms`,
            });
        }
        else {
            throw new Error("No AI provider available");
        }
        console.log("🎯 AI Enhancement Complete", {
            provider: actualProvider,
            totalDuration: `${Date.now() - startTime}ms`,
            success: true,
        });
        return {
            enhancedSummary: enhanceSummary(resumeData.summary, enhancedText),
            enhancedExperience: resumeData.experience.map((exp) => (Object.assign(Object.assign({}, exp), { enhancedDescription: enhanceExperienceDescription(exp.description, enhancedText) }))),
            skillSuggestions: extractSkillSuggestions(enhancedText),
            improvementTips: extractImprovementTips(enhancedText),
        };
    }
    catch (error) {
        console.error("❌ AI enhancement failed:", error);
        console.error("💥 ERROR DETAILS", {
            error: error instanceof Error ? error.message : "Unknown error",
            modelId,
            timestamp: new Date().toISOString(),
        });
        return {
            enhancedSummary: resumeData.summary,
            enhancedExperience: resumeData.experience.map((exp) => (Object.assign(Object.assign({}, exp), { enhancedDescription: exp.description }))),
            skillSuggestions: [],
            improvementTips: ["Consider adding more quantifiable achievements"],
        };
    }
}
/**
 * Create resume enhancement prompt
 */
function createResumeEnhancementPrompt(resumeData, tone) {
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
function enhanceSummary(originalSummary, aiResponse) {
    const lines = aiResponse.split("\n");
    const summaryLine = lines.find((line) => line.toLowerCase().includes("summary"));
    return summaryLine
        ? summaryLine.replace(/^(enhanced summary|summary):/i, "").trim()
        : originalSummary;
}
/**
 * Enhance experience description with AI response
 */
function enhanceExperienceDescription(originalDesc, aiResponse) {
    if (aiResponse) {
        const descMatch = aiResponse.match(/enhanced description[s]?:?\s*([^.!?\n]+)/i);
        if (descMatch) {
            return descMatch[1].trim();
        }
    }
    return originalDesc;
}
/**
 * Extract skill suggestions from AI response
 */
function extractSkillSuggestions(aiResponse) {
    const skillMatches = aiResponse.match(/(?:additional skills?|skills?):?\s*([^.!?]*)/i);
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
function extractImprovementTips(aiResponse) {
    const tipMatches = aiResponse.match(/(?:tips?|improvements?):?\s*([^.!?]*)/i);
    if (tipMatches) {
        return tipMatches[1]
            .split(",")
            .map((tip) => tip.trim())
            .filter((tip) => tip.length > 0);
    }
    return ["Focus on quantifiable achievements", "Use strong action verbs"];
}
//# sourceMappingURL=resumeService.js.map