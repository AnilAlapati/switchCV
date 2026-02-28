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
  type ResumeDataRequirements,
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
  GenerationQualityReport,
  ResumeGenerationVersion,
} from "@/lib/services/resumeService";
import type { SubscriptionTier } from "@/lib/config";
import {
  buildEvidenceMap,
  buildQualityReport,
  evaluateFactualAlignment,
  buildRepairPrompt,
  evaluateResumeV2Flags,
  validateStructuredResumeContract,
} from "@/lib/services/resumeGenerationQuality";
import {
  applyCreativePolish,
  type CreativeStyle,
} from "@/lib/services/resumeCreativePolisher";

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

const EMPTY_EXTRACTION_RESULT = {
  data: {},
  confidence: 0,
  extractedFields: [] as string[],
  isComplete: false,
};

interface NormalizedAIResponse {
  text: string;
  model?: string;
}

function normalizeAIResponse(payload: unknown): NormalizedAIResponse {
  if (typeof payload === "string") {
    return { text: payload };
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as { text?: unknown; model?: unknown };
    return {
      text: typeof candidate.text === "string" ? candidate.text : "",
      model: typeof candidate.model === "string" ? candidate.model : undefined,
    };
  }

  return { text: "" };
}

export interface SyncGenerationInput {
  userId: string;
  message: string;
  conversationHistory: ConversationEntry[];
  sessionData?: SessionData;
  modelId?: string;
  userTier: SubscriptionTier;
  strictMode?: boolean;
  desiredStyle?: "professional" | "executive" | "innovator";
  inputSources?: Array<"chat" | "paste" | "pdf" | "docx">;
  persistResult?: boolean;
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
  qualityReport?: GenerationQualityReport;
  needsClarification?: boolean;
  missingEvidenceFields?: string[];
  previewData?: GeneratedResumeInput;
  evidenceMap?: Record<string, string[]>;
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
    strictMode,
    desiredStyle,
    persistResult,
  } = input;

  const shouldPersistResult = persistResult ?? true;

  const flags = await evaluateResumeV2Flags();
  const strictValidationEnabled = strictMode ?? flags.resume_v2_strict_validation;
  const allMessages = [...conversationHistory, { content: message, isUser: true }];

  logger.info(
    {
      flags,
      strictValidationEnabled,
    },
    "🚩 Resume generation flags evaluated",
  );

  // Step 1: Extract data from conversation history
  let extractionResult = EMPTY_EXTRACTION_RESULT;
  try {
    const extracted = ResumeDataExtractor.extractFromConversation(allMessages);
    extractionResult = extracted ?? EMPTY_EXTRACTION_RESULT;
  } catch (extractError) {
    logger.warn(
      { err: extractError, userId },
      "Resume extraction failed; proceeding with empty extracted data",
    );
  }

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
  const allText = allMessages
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
  const normalizedAIResponse = normalizeAIResponse(aiResponse);
  const responseText = normalizedAIResponse.text;

  // Track Billing
  await BillingService.trackUsage(userId, normalizedAIResponse.model || "default", {
    input: Math.ceil(prompt.length / 4),
    output: Math.ceil(responseText.length / 4),
  });

  // Step 5: Check if AI indicates completion or if we have enough data
  const aiIndicatesCompletion = isCompletionResponse(responseText);

  // CRITICAL FIX: Sync generated JSON with ConversationManager
  let updatedProgress = progress;
  const generatedJson = flags.resume_v2_writer ? extractResumeJSON(responseText) : null;

  if (generatedJson) {
    logger.info("🧠 Syncing AI-generated JSON back to ConversationManager");
    conversationManager.updateData(generatedJson);
    conversationManager.markAsComplete();
    updatedProgress = conversationManager.getProgress();
  } else if (!flags.resume_v2_writer) {
    logger.info("🛑 resume_v2_writer disabled; using extracted conversation data only");
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
      let resumeData = generatedJson;
      let regenerationAttempts = 0;

      if (!resumeData) {
        resumeData = conversationManager.getData();
      }

      let candidateData =
        resumeData && typeof resumeData === "object"
          ? (resumeData as Record<string, unknown>)
          : {};

      const evaluateCandidate = (candidate: Record<string, unknown>) => {
        const candidateManager = new ConversationManager(
          candidate as Partial<ResumeDataRequirements>,
        );
        const baseValidation = candidateManager.validate({
          strictMode: strictValidationEnabled,
        });
        const baseErrors = Array.isArray(baseValidation.errors)
          ? baseValidation.errors
          : [];
        const contractErrors = validateStructuredResumeContract(candidate, {
          strictMode: strictValidationEnabled,
        });
        const factualAlignment = evaluateFactualAlignment(candidate, allMessages);
        const strictFactualErrors = strictValidationEnabled
          ? factualAlignment.errors
          : [];
        const errors = [
          ...new Set([
            ...baseErrors,
            ...contractErrors,
            ...strictFactualErrors,
          ]),
        ];

        return {
          valid: errors.length === 0,
          errors,
          factualAlignment,
        };
      };

      let validation = evaluateCandidate(candidateData);
      let creativeAnnotations: string[] = [];
      let creativePolishApplied = false;

      if (
        !validation.valid &&
        flags.resume_v2_writer &&
        validation.errors.length > 0
      ) {
        const repairPrompt = buildRepairPrompt(
          responseText,
          candidateData,
          validation.errors,
        );

        try {
          regenerationAttempts = 1;
          const repairResponse = await generateTextWithTier({
            prompt: repairPrompt,
            maxTokens: 2500,
            temperature: 0.2,
            userTier,
            modelId,
          });

          await BillingService.trackUsage(userId, repairResponse.model || "default", {
            input: Math.ceil(repairPrompt.length / 4),
            output: Math.ceil(repairResponse.text.length / 4),
          });

          const repairedJson = extractResumeJSON(repairResponse.text);
          if (repairedJson) {
            resumeData = repairedJson;
            candidateData = repairedJson as Record<string, unknown>;
            validation = evaluateCandidate(candidateData);
          }
        } catch (repairError) {
          logger.warn(
            { err: repairError, userId },
            "Validation repair pass failed; falling back to clarification flow",
          );
        }
      }

      if (validation.valid && flags.resume_v2_creative_polish) {
        const polishStyle: CreativeStyle = desiredStyle || "professional";
        const polishResult = applyCreativePolish(candidateData, polishStyle);
        const polishedValidation = evaluateCandidate(polishResult.polishedData);

        if (polishedValidation.valid) {
          candidateData = polishResult.polishedData;
          resumeData = candidateData;
          validation = polishedValidation;
          creativePolishApplied = polishResult.appliedCount > 0;
          creativeAnnotations = polishResult.annotations.map(
            (annotation) =>
              `${annotation.path} | confidence=${annotation.confidence} | ${annotation.reason}`,
          );
        } else {
          logger.warn(
            {
              polishStyle,
              errors: polishedValidation.errors,
            },
            "Creative polish result failed validation; using factual baseline",
          );
        }
      }

      const qualityReport = buildQualityReport(
        {
          schemaValid: validation.valid,
          validationErrors: validation.errors,
          regenerationAttempts,
          factualAlignmentScore: validation.factualAlignment.score,
        },
      );

      if (!validation.valid) {
        logger.warn({ errors: validation.errors }, "⚠️ Validation failed");

        const safeResponse =
          "I'm almost ready to create your resume, but I need a few more details. " +
          (validation.errors.length > 0
            ? "Specifically: " + validation.errors.join(", ")
            : "Please provide more information.");

        return {
          response: safeResponse,
          model: normalizedAIResponse.model,
          progress: updatedProgress.completenessPercentage,
          qualityReport,
          needsClarification: true,
          missingEvidenceFields: validation.errors,
          sessionData: {
            collectedData: candidateData,
            progress: updatedProgress,
          },
        };
      }

      logger.info("✨ Creating generated resume via Service");

      const evidenceMap = buildEvidenceMap(candidateData, allMessages);
      if (creativeAnnotations.length > 0) {
        evidenceMap.creativePolishAnnotations = creativeAnnotations.slice(0, 25);
      }
      const generationVersion: ResumeGenerationVersion = {
        pipeline: creativePolishApplied
          ? "v2_creative"
          : flags.resume_v2_writer
            ? "v2_structured"
            : "v1_regex",
      };

      if (!shouldPersistResult) {
        return {
          response: "Preview generated successfully",
          model: normalizedAIResponse.model,
          created: false,
          progress: 100,
          qualityReport,
          previewData: candidateData as GeneratedResumeInput,
          evidenceMap,
          sessionData: {
            collectedData: candidateData,
            progress: updatedProgress,
          },
        };
      }

      const { resumeId, numericId } = await saveGeneratedResume(
        userId,
        candidateData as GeneratedResumeInput,
        {
          qualityReport,
          evidenceMap,
          generationVersion,
        },
      );

      const cleanResponse = "One moment, I'm finalizing your resume...";

      logger.info({ data: resumeId }, "✅ Resume created successfully:");

      return {
        response: cleanResponse,
        model: normalizedAIResponse.model,
        resumeId,
        numericId,
        created: true,
        progress: 100,
        qualityReport,
      };
    } catch (createError) {
      logger.error({ err: createError }, "❌ Error creating resume:");
      throw createError;
    }
  }

  // Step 7: Continue conversation (not ready yet)
  return {
    response: responseText,
    model: normalizedAIResponse.model,
    progress: updatedProgress.completenessPercentage,
    sessionData: {
      collectedData: conversationManager.getData(),
      progress: updatedProgress,
    },
  };
}
