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
exports.generateJobMatchSuggestions = exports.generateResumeContent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const inference_1 = require("@huggingface/inference");
const generative_ai_1 = require("@google/generative-ai");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
admin.initializeApp();
// Initialize AI clients
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!HUGGINGFACE_TOKEN) {
    console.warn("HUGGINGFACE_TOKEN not set. Hugging Face features may not work.");
}
if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set. Gemini features may not work.");
}
const hf = new inference_1.HfInference(HUGGINGFACE_TOKEN);
const genAI = GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY) : null;
// CORS configuration
const corsHandler = (0, cors_1.default)({ origin: true });
// Helmet for security
const helmetHandler = (0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable CSP for API responses
});
// Generate AI-powered resume content
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
                const { userId, resumeData, template = "modern", tone = "professional", modelId = "gemini-1.5-flash", // Default to Gemini for speed
                 } = req.body;
                if (!userId || !resumeData) {
                    res.status(400).json({
                        error: "Missing required fields: userId and resumeData",
                    });
                    return;
                }
                // Validate model selection
                const allowedModels = [
                    "gpt2-medium",
                    "gpt2",
                    "google/flan-t5-base",
                    "distilgpt2",
                    "mistralai/Mistral-7B-Instruct-v0.3",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                ];
                if (modelId && !allowedModels.includes(modelId)) {
                    res.status(400).json({
                        error: `Invalid model: ${modelId}. Allowed models: ${allowedModels.join(", ")}`,
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
// Enhance resume with AI suggestions
async function enhanceResumeWithAI(resumeData, tone, modelId) {
    const startTime = Date.now();
    console.log("🤖 AI ENHANCEMENT STARTING", {
        modelId,
        tone,
        timestamp: new Date().toISOString(),
    });
    try {
        // Create a comprehensive prompt for the AI
        const prompt = createResumeEnhancementPrompt(resumeData, tone);
        // Determine which AI provider to use
        const isGemini = modelId.startsWith("gemini-");
        const useGemini = isGemini && genAI;
        const useHuggingFace = !isGemini && HUGGINGFACE_TOKEN;
        // Randomly choose between providers if no specific model is requested
        const randomProvider = Math.random() < 0.5 ? "gemini" : "huggingface";
        let enhancedText = "";
        let actualProvider = "";
        if (useGemini || (randomProvider === "gemini" && genAI)) {
            // Use Gemini
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
            // Use Hugging Face
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
        // Parse and structure the AI response
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
        // Fallback to basic enhancement
        return {
            enhancedSummary: resumeData.summary,
            enhancedExperience: resumeData.experience.map((exp) => (Object.assign(Object.assign({}, exp), { enhancedDescription: exp.description }))),
            skillSuggestions: [],
            improvementTips: ["Consider adding more quantifiable achievements"],
        };
    }
}
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
function enhanceSummary(originalSummary, aiResponse) {
    // Extract enhanced summary from AI response
    // This is a simplified implementation - in production, you'd use better parsing
    const lines = aiResponse.split("\n");
    const summaryLine = lines.find((line) => line.toLowerCase().includes("summary"));
    return summaryLine
        ? summaryLine.replace(/^(enhanced summary|summary):/i, "").trim()
        : originalSummary;
}
function enhanceExperienceDescription(originalDesc, aiResponse) {
    // Basic enhancement - in production, use more sophisticated parsing
    if (aiResponse) {
        // Try to extract enhanced descriptions from AI response
        const descMatch = aiResponse.match(/enhanced description[s]?:?\s*([^.!?\n]+)/i);
        if (descMatch) {
            return descMatch[1].trim();
        }
    }
    return originalDesc; // Fallback to original
}
function extractSkillSuggestions(aiResponse) {
    // Extract skill suggestions from AI response
    const skillMatches = aiResponse.match(/(?:additional skills?|skills?):?\s*([^.!?]*)/i);
    if (skillMatches) {
        return skillMatches[1]
            .split(",")
            .map((skill) => skill.trim())
            .filter((skill) => skill.length > 0);
    }
    return [];
}
function extractImprovementTips(aiResponse) {
    // Extract improvement tips from AI response
    const tipMatches = aiResponse.match(/(?:tips?|improvements?):?\s*([^.!?]*)/i);
    if (tipMatches) {
        return tipMatches[1]
            .split(",")
            .map((tip) => tip.trim())
            .filter((tip) => tip.length > 0);
    }
    return ["Focus on quantifiable achievements", "Use strong action verbs"];
}
// Generate resume suggestions based on job description
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
                const { userId, jobDescription, resumeData, modelId = "gemini-1.5-flash", // Default to Gemini for analysis
                 } = req.body;
                if (!userId || !jobDescription || !resumeData) {
                    res.status(400).json({ error: "Missing required fields" });
                    return;
                }
                // Validate model selection
                const allowedModels = [
                    "gpt2-medium",
                    "gpt2",
                    "google/flan-t5-base",
                    "distilgpt2",
                    "mistralai/Mistral-7B-Instruct-v0.3",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                ];
                if (modelId && !allowedModels.includes(modelId)) {
                    res.status(400).json({
                        error: `Invalid model: ${modelId}. Allowed models: ${allowedModels.join(", ")}`,
                    });
                    return;
                }
                // Verify authentication (similar to above)
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
        const response = await hf.textGeneration({
            model: modelId,
            inputs: prompt,
            parameters: {
                max_new_tokens: modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
                temperature: 0.6,
            },
        });
        return {
            analysis: response.generated_text || "Analysis generated",
            matchScore: Math.floor(Math.random() * 40) + 60, // Placeholder scoring
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
//# sourceMappingURL=index.js.map