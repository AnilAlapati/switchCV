import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { HfInference } from "@huggingface/inference";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

// Initialize AI clients
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const hf = new HfInference(HUGGINGFACE_TOKEN);
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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

// CORS configuration
const corsHandler = cors({ origin: true });

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

/**
 * Generate AI-powered resume content
 */
export const generateResumeContent = functions
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
          const {
            userId,
            resumeData,
            template = "modern",
            tone = "professional",
            modelId = "gemini-1.5-flash",
          } = req.body as GenerateResumeRequest;

          if (!userId || !resumeData) {
            res.status(400).json({
              error: "Missing required fields: userId and resumeData",
            });
            return;
          }

          // Validate model selection
          if (modelId && !ALLOWED_MODELS.includes(modelId)) {
            res.status(400).json({
              error: `Invalid model: ${modelId}. Allowed models: ${ALLOWED_MODELS.join(
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

          // Generate enhanced resume content using AI
          const enhancedContent = await enhanceResumeWithAI(
            resumeData,
            tone,
            modelId
          );

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

      enhancedText = await resilientCall(
        async () => {
          const model = genAI!.getGenerativeModel({
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
      const response = await resilientCall(
        async () => {
          return hf.textGeneration({
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
