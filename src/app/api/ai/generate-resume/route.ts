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
import {
  GenerateResumeRequest,
  GenerateResumeSchema,
  createResumeEnhancementPrompt,
  parseAIResponse,
} from "@/lib/services/ai/resume-enhancer";
import { containsPromptInjection } from "@/lib/utils/promptSafety";

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
        request,
      );
    }

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
        request,
      );
    }

    // 3. Billing & Budget Check
    const budgetAllowed = await BillingService.checkBudget(
      userId,
      userRole as "basic" | "premium" | "enterprise",
    );
    if (!budgetAllowed) {
      return handleApiError(
        new Error("Budget exceeded"),
        "Monthly usage limit reached. Please upgrade your plan.",
        402,
        request,
      );
    }

    let body: GenerateResumeRequest;
    try {
      const rawBody = await request.json();
      const validationResult = GenerateResumeSchema.safeParse(rawBody);

      if (!validationResult.success) {
        return handleApiError(
          new Error("Invalid request body"),
          "Validation failed for request body",
          400,
          request,
        );
      }
      body = validationResult.data;
    } catch {
      return handleApiError(
        new Error("Invalid JSON body"),
        "Invalid JSON body",
        400,
        request,
      );
    }

    const {
      resumeData,
      tone = "professional",
      mode = "standard",
      feedback,
    } = body;

    // SECURITY: Check for prompt injection in resume text fields
    const textFields = [
      resumeData.summary,
      resumeData.personalInfo?.name,
      feedback,
    ].filter(Boolean) as string[];
    if (textFields.some((field) => containsPromptInjection(field))) {
      logger.warn(
        { userId },
        "Prompt injection attempt detected in generate-resume",
      );
      return handleApiError(null, "Invalid characters in input", 400, request);
    }

    // 3. PROPOSED: Agentic Workflow Logic (replaces standard flow if enabled)

    // Fetch user for subscription tier (already fetched above)
    // const userSnapshot = await adminDb.collection("users").doc(userId).get();
    // const userRole = userSnapshot.data()?.subscriptionTier || "basic";

    let aiResponseText = "";
    let aiModel = "";
    let aiProvider = "";

    const agentInstructions = feedback
      ? `Please revise this resume using the following feedback: ${feedback}`
      : undefined;

    // Try Agentic Workflow
    const agenticResult = await runAgenticWorkflow(userId, userRole, {
      userResume: JSON.stringify(resumeData),
      jobDescription: "", // Not provided in current API schema
      mode: mode as "standard" | "autonomous",
      outputFormatInstruction: `
                Please provide enhancements in the following JSON format (IMPORTANT - respond ONLY with valid JSON):
                {
                    "enhancedSummary": "...",
                    "enhancedExperience": [...],
                    "skillSuggestions": [...],
                    "improvementTips": [...]
                }
             `,
      instructions: agentInstructions,
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
      logger.info(
        { userId, suggestedTemplateId },
        "🚀 Agentic Workflow Executed Successfully",
      );
    } else {
      // Fallback to standard flow
      // Create prompt for AI
      const prompt = createResumeEnhancementPrompt(resumeData, tone, feedback);

      logger.info(
        {
          userId,
          name: resumeData.personalInfo.name,
          tone,
          feedbackProvided: Boolean(feedback),
          skillCount: (resumeData.skills || []).length,
          experienceCount: (resumeData.experience || []).length,
        },
        "🤖 Starting AI resume enhancement (Standard Flow)...",
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
      "✅ AI generation successful",
    );

    // Track Billing
    // Estimate tokens (1 char ~= 0.25 tokens for simple estimation if provider doesn't return usage)
    const estimatedInputTokens = Math.ceil(
      JSON.stringify(resumeData).length / 4,
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
        recommendations: suggestedTemplateId
          ? {
              templateId: suggestedTemplateId,
              reasoning: designReasoning,
            }
          : undefined,
      },
      {
        headers: createCorsHeaders(request),
      },
    );
  } catch (error: unknown) {
    return handleApiError(
      error,
      "Failed to generate resume enhancement",
      500,
      request,
    );
  }
}
