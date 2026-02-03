import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { BillingService } from "@/lib/services/billingService";
import {
  handleApiError,
  getAuthenticatedUserId,
  validateCorsRequest,
} from "@/lib/utils/api-helpers";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/utils/cors";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { runAgenticWorkflow } from "@/lib/services/agentOrchestrator";
import { getTierForRole } from "@/lib/services/userService";

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
  mode?: "standard" | "autonomous"; // Added mode parameter
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return handleCorsPreflightRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 0. Validate CORS origin
    const corsError = validateCorsRequest(request);
    if (corsError) return corsError;

    // 1. Verify Authentication
    const { userId } = await getAuthenticatedUserId(request);
    if (!userId) {
      return handleApiError(
        new Error("Unauthorized"),
        "Unauthorized",
        401,
        request
      );
    }

    // 2. Check Rate Limit
    // Fetch user for subscription tier
    // 2. Check Rate Limit
    // Fetch user for subscription tier (Jobseeker context for resume generation)
    const userRole = await getTierForRole(userId, "jobseeker");

    const rateLimitResult = await checkDistributedRateLimit(userId, {
      tier: userRole as "basic" | "premium" | "enterprise",
      scope: "ai_generation",
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(
        new Error("Too many requests"),
        "Too many requests. Please try again later.",
        429,
        request
      );
    }

    // 3. Billing & Budget Check
    const budgetAllowed = await BillingService.checkBudget(userId, userRole as "basic" | "premium" | "enterprise");
    if (!budgetAllowed) {
      return handleApiError(
        new Error("Budget exceeded"),
        "Monthly usage limit reached. Please upgrade your plan.",
        402,
        request
      );
    }

    let body: GenerateResumeRequest;
    try {
      body = (await request.json()) as GenerateResumeRequest;
    } catch {
      return handleApiError(
        new Error("Invalid JSON body"),
        "Invalid JSON body",
        400,
        request
      );
    }
    const { resumeData, tone = "professional", mode = "standard" } = body;

    // Validate resumeData
    if (!resumeData) {
      return handleApiError(
        new Error("Missing resume data"),
        "Missing resume data",
        400,
        request
      );
    }

    // 3. PROPOSED: Agentic Workflow Logic (replaces standard flow if enabled)

    // Fetch user for subscription tier (already fetched above)
    // const userSnapshot = await adminDb.collection("users").doc(userId).get();
    // const userRole = userSnapshot.data()?.subscriptionTier || "basic";

    let aiResponseText = "";
    let aiModel = "";
    let aiProvider = "";

    // Try Agentic Workflow
    const agenticResult = await runAgenticWorkflow(userId, userRole, {
      userResume: JSON.stringify(resumeData),
      jobDescription: "", // Not provided in current API schema
      mode: mode as "standard" | "autonomous", // Pass mode to orchestrator
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

    let suggestedTemplateId: string | undefined;
    let designReasoning: string | undefined;

    if (agenticResult) {
      // Agentic workflow returns resumeMarkdown which should contain the JSON enhancement
      aiResponseText = agenticResult.resumeMarkdown;
      suggestedTemplateId = agenticResult.templateId;
      designReasoning = agenticResult.reasoning;
      aiModel = "agentic-workflow";
      aiProvider = "google"; // Assumed primary provider for agentic
      logger.info({ userId, suggestedTemplateId }, "🚀 Agentic Workflow Executed Successfully");
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

    // Track Billing
    // Estimate tokens (1 char ~= 0.25 tokens for simple estimation if provider doesn't return usage)
    const estimatedInputTokens = Math.ceil(
      JSON.stringify(resumeData).length / 4
    );
    const estimatedOutputTokens = Math.ceil(aiResponseText.length / 4);

    await BillingService.trackUsage(userId, aiModel || "default", {
      input: estimatedInputTokens,
      output: estimatedOutputTokens,
    });

    // Parse AI response
    const enhancedContent = parseAIResponse(aiResponseText, resumeData);

    return NextResponse.json(
      {
        success: true,
        data: enhancedContent,
        model: aiModel,
        provider: aiProvider,
        recommendations: suggestedTemplateId ? {
          templateId: suggestedTemplateId,
          reasoning: designReasoning
        } : undefined
      },
      {
        headers: createCorsHeaders(request),
      }
    );
  } catch (error: unknown) {
    return handleApiError(
      error,
      "Failed to generate resume enhancement",
      500,
      request
    );
  }
}

/**
 * Create a detailed prompt for resume enhancement
 */
function createResumeEnhancementPrompt(resumeData: GenerateResumeRequest["resumeData"], tone: string): string {
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
        (exp) =>
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
      .map((edu) => `${edu.degree} from ${edu.institution} (${edu.year})`)
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
function parseAIResponse(aiText: string, resumeData: GenerateResumeRequest["resumeData"]): Record<string, unknown> {
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
      ).map((exp: Record<string, unknown>) => ({
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
function generateFallbackEnhancement(resumeData: GenerateResumeRequest["resumeData"]): Record<string, unknown> {
  return {
    enhancedSummary: `Results-driven professional with ${resumeData.experience.length
      }+ years of experience in ${resumeData.skills[0] || "leadership"
      }. Proven track record of delivering high-impact solutions and driving organizational success.`,
    enhancedExperience: resumeData.experience.map((exp) => ({
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
