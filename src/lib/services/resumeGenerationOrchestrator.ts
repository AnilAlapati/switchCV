/**
 * Resume Generation Orchestrator Service
 *
 * Extracted from resume/generate/route.ts to keep the route file thin.
 * Handles the synchronous resume generation flow:
 *   1. Data extraction from conversation history
 *   2. Conversation management & progress tracking
 *   3. AI prompt building & generation (tier-aware with fallback)
 *   4. Billing tracking
 *   5. Resume creation when ready
 */

import { logger } from "@/lib/logger";
import { generateText } from "@/lib/services/aiGenerationService";
import { generateTextWithTier } from "@/lib/services/aiProviderService";
import { BillingService } from "@/lib/services/billingService";
import {
  ConversationManager,
  type ConversationProgress,
} from "@/lib/services/conversationManager";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import {
  buildConversationalPrompt,
  extractResumeJSON,
  isCompletionResponse,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";
import {
  saveGeneratedResume,
  GeneratedResumeInput,
} from "@/lib/services/resumeService";
import type { SubscriptionTier } from "@/lib/config";

export interface ConversationEntry {
  id?: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
}

interface SessionData {
  collectedData?: Record<string, unknown>;
  progress?: Record<string, unknown>;
}

export interface SyncGenerationInput {
  userId: string;
  message: string;
  conversationHistory: ConversationEntry[];
  sessionData?: SessionData;
  modelId?: string;
  userTier: SubscriptionTier;
}

export interface SyncGenerationResult {
  response?: string;
  model?: string;
  resumeId?: string;
  numericId?: number;
  created?: boolean;
  progress: number;
  sessionData?: {
    collectedData: Record<string, unknown>;
    progress: ConversationProgress;
  };
}

/**
 * Perform synchronous resume generation.
 * Returns a result object that the route handler converts to a NextResponse.
 */
export async function processSyncGeneration(
  input: SyncGenerationInput,
): Promise<SyncGenerationResult> {
  const {
    userId,
    message,
    conversationHistory,
    sessionData,
    modelId,
    userTier,
  } = input;

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
    "📊 Extraction Result:",
  );

  // Step 2: Initialize conversation manager with extracted data
  const conversationManager = new ConversationManager(
    sessionData?.collectedData || extractionResult.data,
  );

  conversationManager.updateData(extractionResult.data);
  const progress = conversationManager.getProgress();

  logger.info(
    {
      completeness: `${progress.completenessPercentage}%`,
      isReady: progress.isReadyToCreate,
      missing: progress.missingFields,
    },
    "🎯 Progress:",
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
      message,
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
    userWantsToCreate,
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
      "Tier-based AI provider selection failed, falling back to legacy generator",
    );
    aiResponse = await generateText(prompt, 4000, 0.7);
  }
  const responseText = aiResponse.text;

  // Track Billing
  await BillingService.trackUsage(userId, aiResponse.model || "default", {
    input: Math.ceil(prompt.length / 4),
    output: Math.ceil(responseText.length / 4),
  });

  // Step 5: Check if AI indicates completion or if we have enough data
  const aiIndicatesCompletion = isCompletionResponse(responseText);

  // CRITICAL FIX: Sync generated JSON with ConversationManager
  let updatedProgress = progress;
  const generatedJson = extractResumeJSON(responseText);

  if (generatedJson) {
    logger.info("🧠 Syncing AI-generated JSON back to ConversationManager");
    conversationManager.updateData(generatedJson);
    conversationManager.markAsComplete();
    updatedProgress = conversationManager.getProgress();
  }

  // Determine if we should create the resume
  let shouldCreateResume = false;
  if (config.maxQuestionsInBetaMode) {
    shouldCreateResume =
      aiIndicatesCompletion ||
      updatedProgress.completenessPercentage >= config.completionThreshold ||
      (userWantsToCreate && updatedProgress.hasMinimumData);
  } else {
    shouldCreateResume =
      aiIndicatesCompletion ||
      updatedProgress.isReadyToCreate ||
      (userWantsToCreate && updatedProgress.hasMinimumData);
  }

  logger.info(
    {
      aiIndicatesCompletion,
      userWantsToCreate,
      isReadyToCreate: updatedProgress.isReadyToCreate,
      completenessPercentage: updatedProgress.completenessPercentage,
      completionThreshold: config.completionThreshold,
      shouldCreateResume,
    },
    "🤔 Decision:",
  );

  // Step 6: Create resume if ready
  if (shouldCreateResume && updatedProgress.hasMinimumData) {
    try {
      let resumeData = extractResumeJSON(responseText);

      if (!resumeData) {
        resumeData = conversationManager.getData();
      }

      const validation = conversationManager.validate();
      if (!validation.valid) {
        logger.warn({ errors: validation.errors }, "⚠️ Validation failed");

        let safeResponse = responseText;
        if (extractResumeJSON(responseText)) {
          safeResponse =
            "I'm almost ready to create your resume, but I need a few more details. " +
            (validation.errors.length > 0
              ? "Specifically: " + validation.errors.join(", ")
              : "Please provide more information.");
        }

        return {
          response: safeResponse,
          model: aiResponse.model,
          progress: updatedProgress.completenessPercentage,
          sessionData: {
            collectedData: conversationManager.getData(),
            progress: updatedProgress,
          },
        };
      }

      logger.info("✨ Creating generated resume via Service");

      const { resumeId, numericId } = await saveGeneratedResume(
        userId,
        resumeData as GeneratedResumeInput,
      );

      const cleanResponse = "One moment, I'm finalizing your resume...";

      logger.info({ data: resumeId }, "✅ Resume created successfully:");

      return {
        response: cleanResponse,
        model: aiResponse.model,
        resumeId,
        numericId,
        created: true,
        progress: 100,
      };
    } catch (createError) {
      logger.error({ err: createError }, "❌ Error creating resume:");
      throw createError;
    }
  }

  // Step 7: Continue conversation (not ready yet)
  return {
    response: responseText,
    model: aiResponse.model,
    progress: updatedProgress.completenessPercentage,
    sessionData: {
      collectedData: conversationManager.getData(),
      progress: updatedProgress,
    },
  };
}
