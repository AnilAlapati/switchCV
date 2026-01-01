import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { generateTextWithTier } from "@/lib/services/aiProviderService";
import { ConversationManager } from "@/lib/services/conversationManager";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import {
  buildConversationalPrompt,
  extractResumeJSON,
  isCompletionResponse,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { adminDb } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import type { SubscriptionTier } from "@/lib/config";

interface GenerateResumeRequest {
  message: string;
  conversationHistory: Array<{
    id: string;
    content: string;
    isUser: boolean;
    timestamp: string;
  }>;
  sessionData?: any; // Optional stored session data
  modelId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (optional - log but don't block)
    let userId = "anonymous";
    const { userId: authenticatedUserId } = await getAuthenticatedUserId(
      request
    );

    if (authenticatedUserId) {
      userId = authenticatedUserId;
      logger.info({ data: userId }, "✅ Authenticated user:");
    } else {
      logger.warn("⚠️ No valid token, proceeding as anonymous");
    }

    const body: GenerateResumeRequest = await request.json();
    const { message, conversationHistory, sessionData, modelId } = body;

    let userTier: SubscriptionTier = "basic";
    if (authenticatedUserId) {
      try {
        userTier = await getUserTier(authenticatedUserId);
      } catch (tierError) {
        logger.warn(
          { err: tierError, userId: authenticatedUserId },
          "Failed to load user tier, defaulting to basic"
        );
      }
    }

    // Enforce Quantity Limit for Basic Users
    if (userTier === "basic") {
      const resumesSnapshot = await adminDb
        .collection("resumes")
        .where("userId", "==", userId)
        .count()
        .get();

      const resumeCount = resumesSnapshot.data().count;

      if (resumeCount >= 1) {
        // Check if user is trying to regenerate/edit an existing one (which is allowed if supported)
        // But this is the CREATE endpoint.
        // Basic users can't create a 2nd resume.
        logger.warn(
          { userId, resumeCount },
          "⛔ Basic user attempted to create 2nd resume"
        );
        return NextResponse.json(
          {
            response:
              "You have reached the limit of 1 resume for the Basic plan. Please upgrade to Premium to create more resumes.",
            model: "system",
            error: "LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    if (!message) {
      return handleApiError(
        new Error("Message is required"),
        "Message is required",
        400
      );
    }

    // Step 1: Extract data from conversation history
    const extractionResult = ResumeDataExtractor.extractFromConversation([
      ...conversationHistory,
      { content: message, isUser: true },
    ]);

    logger.info(
      {
        confidence: extractionResult.confidence,
        extractedFields: extractionResult.extractedFields,
        isComplete: extractionResult.isComplete,
      },
      "📊 Extraction Result:"
    );

    // Step 2: Initialize conversation manager with extracted data
    const conversationManager = new ConversationManager(
      sessionData?.collectedData || extractionResult.data
    );

    // Update with latest extraction
    conversationManager.updateData(extractionResult.data);
    const progress = conversationManager.getProgress();

    logger.info(
      {
        completeness: `${progress.completenessPercentage}%`,
        isReady: progress.isReadyToCreate,
        missing: progress.missingFields,
      },
      "🎯 Progress:"
    );

    // Step 3: Get active configuration
    let config = getActiveConfig();

    // Check for user constraints on questions
    const allText = [...conversationHistory, { content: message, isUser: true }]
      .filter((m) => m.isUser)
      .map((m) => m.content)
      .join(" ");

    const questionLimitMatch = allText.match(/only\s+(\d+)\s+questions?/i);
    if (questionLimitMatch && questionLimitMatch[1]) {
      const limit = parseInt(questionLimitMatch[1], 10);
      if (!isNaN(limit) && limit > 0) {
        config = {
          ...config,
          maxQuestionsInBetaMode: true,
          maxBetaQuestions: limit,
        };
        logger.info(`🎯 User set question limit to ${limit}`);
      }
    }

    // Check if user explicitly wants to create/finish
    const userWantsToCreate =
      /create|generate|finish|done|make it|go ahead|yes|sure|ok|yep|yeah/i.test(
        message
      );

    // Step 3b: Build AI prompt with progress context and config
    const currentProgress = {
      hasName: !!conversationManager.getData().name,
      hasEmail: !!conversationManager.getData().email,
      hasExperience: !!conversationManager.getData().experience?.length,
      hasEducation: !!conversationManager.getData().education?.length,
      hasSkills: !!conversationManager.getData().skills?.length,
    };

    const prompt = buildConversationalPrompt(
      message,
      conversationHistory,
      currentProgress,
      conversationManager.getData(),
      config,
      userWantsToCreate // Pass forceCreate flag
    );

    // Step 4: Generate AI response (tier-aware with graceful fallback)
    type TieredResult = Awaited<ReturnType<typeof generateTextWithTier>>;
    type LegacyResult = Awaited<ReturnType<typeof generateText>>;

    let aiResponse: TieredResult | LegacyResult;

    try {
      aiResponse = await generateTextWithTier({
        prompt,
        maxTokens: 4000,
        temperature: 0.7,
        userTier,
        modelId,
      });
    } catch (tieredError) {
      logger.error(
        { err: tieredError, userId, userTier, modelId },
        "Tier-based AI provider selection failed, falling back to legacy generator"
      );
      aiResponse = await generateText(prompt, 4000, 0.7);
    }
    const responseText = aiResponse.text;

    // Step 5: Check if AI indicates completion or if we have enough data
    const aiIndicatesCompletion = isCompletionResponse(responseText);

    // In beta mode, use completion threshold from config; otherwise use readiness
    let shouldCreateResume = false;
    if (config.maxQuestionsInBetaMode) {
      // Beta mode: create resume when threshold is met OR user asks for it OR AI says so
      shouldCreateResume =
        aiIndicatesCompletion ||
        progress.completenessPercentage >= config.completionThreshold ||
        (userWantsToCreate && progress.hasMinimumData);
    } else {
      // Production mode: create when AI says or when ready OR user asks for it
      shouldCreateResume =
        aiIndicatesCompletion ||
        progress.isReadyToCreate ||
        (userWantsToCreate && progress.hasMinimumData);
    }

    logger.info(
      {
        aiIndicatesCompletion,
        userWantsToCreate,
        isReadyToCreate: progress.isReadyToCreate,
        completenessPercentage: progress.completenessPercentage,
        completionThreshold: config.completionThreshold,
        shouldCreateResume,
      },
      "🤔 Decision:"
    );

    // Step 6: Create resume if ready
    if (shouldCreateResume && progress.hasMinimumData) {
      try {
        // Extract any JSON data from AI response
        let resumeData = extractResumeJSON(responseText);

        if (!resumeData) {
          // Use collected data if no JSON in response
          resumeData = conversationManager.getData();
        }

        // Validate we have minimum required data
        const validation = conversationManager.validate();
        if (!validation.valid) {
          logger.warn({ errors: validation.errors }, "⚠️ Validation failed");

          // If validation fails but we have JSON, don't show raw JSON to user
          let safeResponse = responseText;
          if (extractResumeJSON(responseText)) {
            safeResponse =
              "I'm almost ready to create your resume, but I need a few more details. " +
              (validation.errors.length > 0
                ? "Specifically: " + validation.errors.join(", ")
                : "Please provide more information.");
          }

          // Continue conversation to gather missing data
          return NextResponse.json({
            response: safeResponse,
            model: aiResponse.model,
            progress: progress.completenessPercentage,
            sessionData: {
              collectedData: conversationManager.getData(),
              progress,
            },
          });
        }

        // Generate numeric ID
        const numericId = await generateNumericResumeId();
        const resumeId = numericId.toString();

        logger.info({ data: resumeId }, "✨ Creating resume with ID:");

        // Prepare resume document
        const resumeDocument = {
          id: resumeId,
          userId,
          numericId,
          title:
            `${resumeData.name || "User"}'s Resume` || "AI Generated Resume",
          personalInfo: {
            name: resumeData.name || "",
            email: resumeData.email || "",
            phone: resumeData.phone || "",
            location: resumeData.location || "",
          },
          summary: resumeData.summary || "",
          experience: resumeData.experience || [],
          education: resumeData.education || [],
          skills: resumeData.skills || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdVia: "ai-conversation",
          isPublic: false,
          status: "draft",
        };

        // Save to Firestore
        await adminDb.collection("resumes").doc(resumeId).set(resumeDocument);

        // Also save to user's subcollection
        await adminDb
          .collection("users")
          .doc(userId)
          .collection("userResumes")
          .doc(resumeId)
          .set({
            id: resumeId,
            title: resumeDocument.title,
            createdAt: resumeDocument.createdAt,
            updatedAt: resumeDocument.updatedAt,
            numericId,
          });

        logger.info({ data: resumeId }, "✅ Resume created successfully:");

        // Return success with resume ID
        return NextResponse.json({
          response:
            responseText +
            `\n\n✅ Great! I've created your resume. You can view it now!`,
          model: aiResponse.model,
          resumeId,
          numericId,
          created: true,
          progress: 100,
        });
      } catch (createError) {
        logger.error({ err: createError }, "❌ Error creating resume:");
        // Fall back to continuing conversation
        return handleApiError(createError, "Resume creation failed");
      }
    }

    // Step 7: Continue conversation (not ready yet)
    return NextResponse.json({
      response: responseText,
      model: aiResponse.model,
      progress: progress.completenessPercentage,
      sessionData: {
        collectedData: conversationManager.getData(),
        progress,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error in resume generation:");
    return handleApiError(error, "Internal server error");
  }
}
