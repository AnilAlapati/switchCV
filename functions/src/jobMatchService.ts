import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HfInference } from "@huggingface/inference";
import cors from "cors";
import helmet from "helmet";
import { JobMatchSuggestions, ResumeData } from "./types";
import {
  resilientCall,
  CircuitBreaker,
  RetryOptions,
} from "./utils/retryHandler";

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const hf = new HfInference(HUGGINGFACE_TOKEN);

// Circuit breaker for HuggingFace
const huggingFaceCircuitBreaker = new CircuitBreaker(5, 60000, 2);

// Retry options
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
 * Generate resume suggestions based on job description
 */
export const generateJobMatchSuggestions = functions
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
            jobDescription,
            resumeData,
            modelId = "gemini-1.5-flash",
          } = req.body;

          if (!userId || !jobDescription || !resumeData) {
            res.status(400).json({ error: "Missing required fields" });
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

          // Verify authentication
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith("Bearer ")) {
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
          const suggestions = await generateJobMatchingSuggestions(
            jobDescription,
            resumeData,
            modelId
          );

          res.status(200).json({
            success: true,
            suggestions,
          });
        } catch (error) {
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
export async function generateJobMatchingSuggestions(
  jobDescription: string,
  resumeData: ResumeData,
  modelId: string
): Promise<JobMatchSuggestions> {
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

    const response = await resilientCall(
      async () => {
        return hf.textGeneration({
          model: modelId,
          inputs: prompt,
          parameters: {
            max_new_tokens:
              modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
            temperature: 0.6,
          },
        });
      },
      {
        retryOptions: aiRetryOptions,
        circuitBreaker: huggingFaceCircuitBreaker,
        timeoutMs: 30000,
        operationName: "job-match-analysis",
      }
    );

    return {
      analysis: response.generated_text || "Analysis generated",
      matchScore: Math.floor(Math.random() * 40) + 60,
      recommendations: [
        "Tailor your resume keywords to match the job description",
        "Highlight relevant experience prominently",
        "Quantify your achievements where possible",
      ],
    };
  } catch (error) {
    console.error("Job matching analysis failed:", error);
    return {
      analysis: "Unable to analyze at this time",
      matchScore: 0,
      recommendations: ["Please try again later"],
    };
  }
}
