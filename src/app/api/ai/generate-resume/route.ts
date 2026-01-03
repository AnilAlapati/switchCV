import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { runAgenticWorkflow } from "@/lib/services/agentOrchestrator";
import { adminDb } from "@/lib/firebase-admin";

interface GenerateResumeRequest {
  resumeData: {
    personalInfo: {
      name: string;
      email: string;
      phone?: string;
      location?: string;
    };
    summary: string;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
    }>;
  };
  tone?: "professional" | "creative" | "concise";
}

interface GenerateResumeResponse {
  success: boolean;
  data?: {
    enhancedSummary: string;
    enhancedExperience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
      enhancedDescription: string;
      achievements: string[];
    }>;
    skillSuggestions: string[];
    improvementTips: string[];
  };
  error?: string;
  model?: string;
  provider?: string;
}

export async function POST(
  request: NextRequest
): Promise<
  NextResponse<GenerateResumeResponse | { error: string; details?: string }>
> {
  try {
    // 1. Verify Authentication
    const { userId } = await getAuthenticatedUserId(request);
    if (!userId) {
      return handleApiError(new Error("Unauthorized"), "Unauthorized", 401);
    }

    // 2. Check Rate Limit (Reuse general AI check or specific)
    // We'll use the existing distributed rate limiter
    const rateLimitResult = await checkDistributedRateLimit(userId, {
      limit: 10, // Consistent with the new "Relaxed" Basic limit (10/min)
      windowMs: 60 * 1000,
      scope: "ai_generation",
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: GenerateResumeRequest;
    try {
      body = (await request.json()) as GenerateResumeRequest;
    } catch {
      return handleApiError(
        new Error("Invalid JSON body"),
        "Invalid JSON body",
        400
      );
    }
    const { resumeData, tone = "professional" } = body;

    // Validate resumeData
    if (!resumeData) {
      return handleApiError(
        new Error("Missing resume data"),
        "Missing resume data",
        400
      );
    }

    // 3. PROPOSED: Agentic Workflow Logic (replaces standard flow if enabled)

    // Fetch user for subscription tier
    const userSnapshot = await adminDb.collection("users").doc(userId).get();
    const userRole = userSnapshot.data()?.subscriptionTier || "basic";

    let aiResponseText = "";
    let aiModel = "";
    let aiProvider = "";

    // Try Agentic Workflow
    const agenticResult = await runAgenticWorkflow(userId, userRole, {
      userResume: JSON.stringify(resumeData),
      jobDescription: "", // Not provided in current API schema
      outputFormatInstruction: `
                Please provide enhancements in the following JSON format (IMPORTANT - respond ONLY with valid JSON):
                {
                    "enhancedSummary": "...",
                    "enhancedExperience": [...],
                    "skillSuggestions": [...],
                    "improvementTips": [...]
                }
             `,
    });

    if (agenticResult) {
      aiResponseText = agenticResult;
      aiModel = "agentic-workflow";
      aiProvider = "google"; // Assumed primary provider for agentic
      logger.info({ userId }, "🚀 Agentic Workflow Executed Successfully");
    } else {
      // Fallback to standard flow
      // Create prompt for AI
      const prompt = createResumeEnhancementPrompt(resumeData, tone);

      logger.info(
        {
          userId,
          name: resumeData.personalInfo.name,
          tone,
          skillCount: (resumeData.skills || []).length,
          experienceCount: (resumeData.experience || []).length,
        },
        "🤖 Starting AI resume enhancement (Standard Flow)..."
      );

      // Call AI service
      const result = await generateText(prompt, 2000, 0.7);
      aiResponseText = result.text;
      aiModel = result.model;
      aiProvider = result.provider;
    }

    /* 
       ORIGINAL CODE REPLACED ABOVE BY THE IF/ELSE BLOCK 
       // Create prompt for AI
       // const prompt = createResumeEnhancementPrompt(resumeData, tone);
       // ...
       // const { text, model, provider } = await generateText(prompt, 2000, 0.7);
    */

    logger.info(
      {
        userId,
        model: aiModel,
        provider: aiProvider,
        responseLength: aiResponseText.length,
      },
      "✅ AI generation successful"
    );

    // Parse AI response
    const enhancedContent = parseAIResponse(aiResponseText, resumeData);

    return NextResponse.json({
      success: true,
      data: enhancedContent,
      model: aiModel,
      provider: aiProvider,
    });
  } catch (error) {
    return handleApiError(error, "Failed to generate resume enhancement");
  }
}

/**
 * Create a detailed prompt for resume enhancement
 */
function createResumeEnhancementPrompt(resumeData: any, tone: string): string {
  const {
    personalInfo,
    summary = "",
    skills = [],
    experience = [],
    education = [],
  } = resumeData;

  const experienceText =
    (experience || [])
      .map(
        (exp: any) =>
          `${exp.title} at ${exp.company} (${exp.duration}): ${exp.description}`
      )
      .join("\n") || "No experience provided";

  return `You are an expert resume writer and career coach. Enhance the following resume content with professional language and impactful descriptions.

RESUME CONTENT:
Name: ${personalInfo.name}
Email: ${personalInfo.email}
Current Summary: ${summary || "Professional seeking opportunities"}

EXPERIENCE:
${experienceText}

SKILLS: ${(skills || []).join(", ") || "Skills not provided"}

EDUCATION:
${(education || [])
      .map((edu: any) => `${edu.degree} from ${edu.institution} (${edu.year})`)
      .join("\n") || "No education provided"
    }

TONE: ${tone}

Please provide enhancements in the following JSON format (IMPORTANT - respond ONLY with valid JSON):
{
  "enhancedSummary": "A compelling 2-3 sentence professional summary highlighting key strengths",
  "enhancedExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "description": "Original description",
      "enhancedDescription": "Enhanced description with impact and metrics",
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "skillSuggestions": ["Additional relevant skill 1", "Additional relevant skill 2", "Additional relevant skill 3"],
  "improvementTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Ensure all descriptions use strong action verbs, quantify achievements with metrics, and maintain the ${tone} tone throughout.`;
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(aiText: string, resumeData: any): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("⚠️ Could not find JSON in AI response, using defaults");
      return generateFallbackEnhancement(resumeData);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      enhancedSummary:
        parsed.enhancedSummary ||
        `Professional ${resumeData.personalInfo.name
        } with expertise in ${resumeData.skills.slice(0, 2).join(" and ")}.`,
      enhancedExperience: (
        parsed.enhancedExperience || resumeData.experience
      ).map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.description,
        enhancedDescription:
          exp.enhancedDescription ||
          `${exp.description} Achieved measurable results through strategic initiatives and collaborative leadership.`,
        achievements: exp.achievements || [
          "Delivered key projects on time",
          "Improved team efficiency",
          "Contributed to company success",
        ],
      })),
      skillSuggestions: parsed.skillSuggestions || [
        "Project Management",
        "Strategic Planning",
        "Data Analysis",
      ],
      improvementTips: parsed.improvementTips || [
        "Add quantifiable metrics to achievements",
        "Use strong action verbs",
        "Highlight leadership and impact",
      ],
    };
  } catch (error) {
    logger.error({ err: error }, "❌ Error parsing AI response:");
    return generateFallbackEnhancement(resumeData);
  }
}

/**
 * Generate fallback enhancement if AI fails
 */
function generateFallbackEnhancement(resumeData: any): any {
  return {
    enhancedSummary: `Results-driven professional with ${resumeData.experience.length
      }+ years of experience in ${resumeData.skills[0] || "leadership"
      }. Proven track record of delivering high-impact solutions and driving organizational success.`,
    enhancedExperience: resumeData.experience.map((exp: any) => ({
      title: exp.title,
      company: exp.company,
      duration: exp.duration,
      description: exp.description,
      enhancedDescription: `${exp.description} Consistently delivered measurable results through strategic planning, cross-functional collaboration, and innovative problem-solving approaches.`,
      achievements: [
        `Improved operational efficiency in ${exp.title} role`,
        "Successfully managed key initiatives",
        "Contributed to team success and organizational goals",
      ],
    })),
    skillSuggestions: [
      "Project Management",
      "Strategic Planning",
      "Team Leadership",
      "Data Analysis",
      "Process Optimization",
    ],
    improvementTips: [
      "Add specific metrics and percentages to achievements",
      "Use powerful action verbs at the start of descriptions",
      "Quantify impact with measurable results",
      "Highlight technical skills relevant to target role",
    ],
  };
}
