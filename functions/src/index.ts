import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HfInference } from "@huggingface/inference";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import helmet from "helmet";

admin.initializeApp();

// Initialize AI clients
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!HUGGINGFACE_TOKEN) {
  console.warn(
    "HUGGINGFACE_TOKEN not set. Hugging Face features may not work."
  );
}

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set. Gemini features may not work.");
}

const hf = new HfInference(HUGGINGFACE_TOKEN);
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// CORS configuration
const corsHandler = cors({ origin: true });

// Helmet for security
const helmetHandler = helmet({
  contentSecurityPolicy: false, // Disable CSP for API responses
});

// Types for enhanced content
interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
    enhancedDescription: string;
  }>;
  skillSuggestions: string[];
  improvementTips: string[];
}

interface JobMatchSuggestions {
  analysis: string;
  matchScore: number;
  recommendations: string[];
}
interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

interface GenerateResumeRequest {
  userId: string;
  resumeData: ResumeData;
  template?: string;
  tone?: "professional" | "creative" | "concise";
  modelId?: string; // New: Allow model selection
}

// Generate AI-powered resume content
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
            modelId = "gemini-1.5-flash", // Default to Gemini for speed
          } = req.body as GenerateResumeRequest;

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
              error: `Invalid model: ${modelId}. Allowed models: ${allowedModels.join(
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

// Enhance resume with AI suggestions
async function enhanceResumeWithAI(
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

      const model = genAI!.getGenerativeModel({
        model: actualModel,
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      enhancedText = response.text();

      console.log("✅ Gemini API Response Received", {
        responseLength: enhancedText.length,
        duration: `${Date.now() - startTime}ms`,
      });
    } else if (useHuggingFace || HUGGINGFACE_TOKEN) {
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
    } else {
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
    // Fallback to basic enhancement
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

function enhanceSummary(originalSummary: string, aiResponse: string): string {
  // Extract enhanced summary from AI response
  // This is a simplified implementation - in production, you'd use better parsing
  const lines = aiResponse.split("\n");
  const summaryLine = lines.find((line) =>
    line.toLowerCase().includes("summary")
  );
  return summaryLine
    ? summaryLine.replace(/^(enhanced summary|summary):/i, "").trim()
    : originalSummary;
}

function enhanceExperienceDescription(
  originalDesc: string,
  aiResponse?: string
): string {
  // Basic enhancement - in production, use more sophisticated parsing
  if (aiResponse) {
    // Try to extract enhanced descriptions from AI response
    const descMatch = aiResponse.match(
      /enhanced description[s]?:?\s*([^.!?\n]+)/i
    );
    if (descMatch) {
      return descMatch[1].trim();
    }
  }
  return originalDesc; // Fallback to original
}

function extractSkillSuggestions(aiResponse: string): string[] {
  // Extract skill suggestions from AI response
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

function extractImprovementTips(aiResponse: string): string[] {
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
            modelId = "gemini-1.5-flash", // Default to Gemini for analysis
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
              error: `Invalid model: ${modelId}. Allowed models: ${allowedModels.join(
                ", "
              )}`,
            });
            return;
          }

          // Verify authentication (similar to above)
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

async function generateJobMatchingSuggestions(
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

    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: {
        max_new_tokens:
          modelId === "mistralai/Mistral-7B-Instruct-v0.3" ? 300 : 200,
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
  } catch (error) {
    console.error("Job matching analysis failed:", error);
    return {
      analysis: "Unable to analyze at this time",
      matchScore: 0,
      recommendations: ["Please try again later"],
    };
  }
}

// ==================== ANALYTICS FUNCTIONS ====================

/**
 * Aggregate analytics data daily
 * Runs at 1 AM UTC every day
 */
export const aggregateAnalyticsDaily = functions.pubsub
  .schedule("0 1 * * *") // Daily at 1 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("📊 Starting daily analytics aggregation...");

    const db = admin.firestore();
    const analyticsRef = db.collection("analytics");
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Get all analytics documents
      const analyticsSnap = await analyticsRef.get();

      for (const doc of analyticsSnap.docs) {
        const analyticsId = doc.id;

        // Get all events for this resume in the last 7 days
        const eventsRef = db
          .collection("analytics")
          .doc(analyticsId)
          .collection("events");
        const eventsSnap = await eventsRef
          .where("timestamp", ">=", sevenDaysAgo.toISOString())
          .get();

        // Calculate metrics
        let totalViews = 0;
        let uniqueViewers = new Set<string>();
        let totalSessionDuration = 0;
        let sessionCount = 0;
        const viewsBySource: Record<string, number> = {
          search: 0,
          direct: 0,
          link: 0,
          recruiter: 0,
          other: 0,
        };
        const topReferrers: Record<string, number> = {};

        for (const eventDoc of eventsSnap.docs) {
          const event = eventDoc.data();
          if (event.eventType === "view") {
            totalViews++;
            if (event.metadata?.viewedBy) {
              uniqueViewers.add(event.metadata.viewedBy);
            }
            if (event.metadata?.sessionDuration) {
              totalSessionDuration += event.metadata.sessionDuration;
              sessionCount++;
            }
            if (event.metadata?.source) {
              viewsBySource[event.metadata.source] =
                (viewsBySource[event.metadata.source] || 0) + 1;
            }
            if (event.metadata?.referrer) {
              topReferrers[event.metadata.referrer] =
                (topReferrers[event.metadata.referrer] || 0) + 1;
            }
          }
        }

        // Calculate engagement metrics
        const avgSessionDuration =
          sessionCount > 0 ? totalSessionDuration / sessionCount : 0;
        const engagementMetrics = {
          resumeId: analyticsId,
          totalViews,
          uniqueViewers: uniqueViewers.size,
          avgSessionDuration: Math.round(avgSessionDuration),
          viewsBySource,
          topReferrers,
          lastViewedAt: now.toISOString(),
          viewTrendLast7Days: await getViewTrendLast7Days(analyticsId),
        };

        // Update engagement document
        await db
          .collection("analytics")
          .doc(analyticsId)
          .collection("engagement")
          .doc("current")
          .set(engagementMetrics, { merge: true });

        console.log(`✅ Aggregated analytics for ${analyticsId}`);
      }

      console.log("📊 Daily analytics aggregation completed");
      return null;
    } catch (error) {
      console.error("Error aggregating analytics:", error);
      return null;
    }
  });

/**
 * Clean up old analytics events
 * Runs weekly to remove events older than 90 days
 */
export const cleanupAnalyticsEvents = functions.pubsub
  .schedule("0 2 * * 0") // Weekly on Sunday at 2 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("🧹 Starting analytics cleanup...");

    const db = admin.firestore();
    const analyticsRef = db.collection("analytics");
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
      // Get all analytics documents
      const analyticsSnap = await analyticsRef.get();
      let deletedCount = 0;

      for (const doc of analyticsSnap.docs) {
        const analyticsId = doc.id;
        const eventsRef = db
          .collection("analytics")
          .doc(analyticsId)
          .collection("events");

        // Find old events
        const oldEventsSnap = await eventsRef
          .where("timestamp", "<", ninetyDaysAgo.toISOString())
          .limit(100)
          .get();

        // Delete in batches
        for (const eventDoc of oldEventsSnap.docs) {
          await eventDoc.ref.delete();
          deletedCount++;
        }
      }

      console.log(
        `🧹 Cleanup completed. Deleted ${deletedCount} old analytics events`
      );
      return null;
    } catch (error) {
      console.error("Error cleaning up analytics:", error);
      return null;
    }
  });

/**
 * Helper: Get view trend for the last 7 days
 */
async function getViewTrendLast7Days(
  analyticsId: string
): Promise<Array<{ date: string; count: number }>> {
  const db = admin.firestore();
  const trend: Array<{ date: string; count: number }> = [];
  const eventsRef = db
    .collection("analytics")
    .doc(analyticsId)
    .collection("events");

  for (let i = 6; i >= 0; i--) {
    const startOfDay = new Date();
    startOfDay.setDate(startOfDay.getDate() - i);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const dayEventsSnap = await eventsRef
      .where("timestamp", ">=", startOfDay.toISOString())
      .where("timestamp", "<=", endOfDay.toISOString())
      .where("eventType", "==", "view")
      .get();

    trend.push({
      date: startOfDay.toISOString().split("T")[0],
      count: dayEventsSnap.docs.length,
    });
  }

  return trend;
}

// ==================== EMAIL AND AUDIT FUNCTIONS ====================
export {
  onUserCreated,
  onRecruiterRequestCreated,
  onRecruiterRequestApproved,
  sendProfileViewDigest,
  notifyAdminSuspiciousActivity,
  cleanupAuditLogs,
} from "./emailFunctions";
