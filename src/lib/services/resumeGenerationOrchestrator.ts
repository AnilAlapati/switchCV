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

import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/errorReporter";
import { captureServerEvent } from "@/lib/services/serverAnalytics";
import { generateText } from "@/lib/services/aiGenerationService";
import { generateTextWithTier } from "@/lib/services/aiProviderService";
import {
  classifyAIFailure,
  createAIObservationContext,
  markAIStageRecoveredWithFallback,
  persistAIFailureEvent,
  persistAIRequestSummary,
  resolveMonitoringSessionId,
} from "@/lib/services/aiMonitoringService";
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
  buildClarificationChecklist,
  buildEvidenceMap,
  buildClarificationMessage,
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
import { persistConversationSession } from "@/lib/services/conversationStorageService";
import type { ConversationMessage } from "@/lib/services/conversationStorageService";
import { AIResumeResponseSchema } from "@/lib/schemas/aiResumeSchema";
import { zodToGeminiSchema } from "@/lib/utils/zodToGeminiSchema";

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

function getProviderFromAIResponse(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "provider" in payload &&
    typeof payload.provider === "string"
  ) {
    return payload.provider;
  }

  return undefined;
}

/**
 * Add a Sentry breadcrumb for an orchestrator pipeline step.
 * Wrapped in try/catch so a Sentry initialisation failure never breaks generation.
 */
function addPipelineBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info",
): void {
  try {
    Sentry.addBreadcrumb({
      category: "resume.generation",
      message,
      level,
      data,
    });
  } catch {
    // Sentry may be unavailable (tests, edge runtime) — never block generation
  }
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
  requestId?: string;
  sessionId?: string;
  entrypoint?: string;
}

export interface SyncGenerationResult {
  requestId: string;
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
  clarificationChecklist?: string[];
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
    requestId: providedRequestId,
    sessionId: providedSessionId,
    entrypoint: providedEntrypoint,
  } = input;

  const shouldPersistResult = persistResult ?? true;
  const requestId = providedRequestId ?? randomUUID();

  const flags = await evaluateResumeV2Flags();
  const strictValidationEnabled =
    strictMode ?? flags.resume_v2_strict_validation;
  const allMessages = [
    ...conversationHistory,
    { content: message, isUser: true },
  ];
  const observationContext = createAIObservationContext({
    userId,
    userTier,
    entrypoint:
      providedEntrypoint ??
      (shouldPersistResult ? "resume_generate" : "resume_preview"),
    requestId,
    sessionId:
      providedSessionId ?? resolveMonitoringSessionId(sessionData, requestId),
    conversationTurn: allMessages.length,
  });
  let monitoringSummary = {
    userVisibleFailure: true,
    finalOutcome: "unhandled_error",
    createdResume: false,
  };
  let generationValidationFailureLogged = false;

  try {
    logger.info(
      {
        flags,
        strictValidationEnabled,
      },
      "🚩 Resume generation flags evaluated",
    );
    addPipelineBreadcrumb("flags evaluated", {
      resume_v2_writer: flags.resume_v2_writer,
      resume_v2_strict_validation: flags.resume_v2_strict_validation,
      strictValidationEnabled,
      userTier,
    });

    // Step 1: Extract data from conversation history using AI (Gemini).
    // NO regex fallback — if AI extraction fails, we return a user-friendly
    // error asking them to try again later.
    let extractionResult = EMPTY_EXTRACTION_RESULT;

    try {
      const aiExtracted =
        await ResumeDataExtractor.extractFromConversationWithAI(allMessages, {
          userTier:
            userTier === "basic" ||
            userTier === "premium" ||
            userTier === "enterprise"
              ? userTier
              : "premium",
          observationContext,
        });
      extractionResult = aiExtracted ?? EMPTY_EXTRACTION_RESULT;

      // Distinguish between AI service failure (confidence=0) and legitimate
      // "user hasn't provided enough data yet" (confidence>0 with empty fields).
      // Only show the error when the AI service itself failed.
      const aiServiceFailed =
        aiExtracted &&
        aiExtracted.confidence === 0 &&
        aiExtracted.extractedFields.length === 0;

      if (!aiExtracted || aiServiceFailed) {
        logger.error(
          {
            method: (aiExtracted as { method?: string })?.method ?? "unknown",
            userId,
          },
          "AI extraction service failed — asking user to retry",
        );
        monitoringSummary = {
          userVisibleFailure: true,
          finalOutcome: "extraction_failed",
          createdResume: false,
        };
        return {
          requestId: observationContext.requestId,
          response:
            "I'm having trouble processing your information right now. Our AI service may be temporarily unavailable. Please try again in a few minutes.",
          progress: 0,
        };
      }

      logger.info(
        { method: (aiExtracted as { method?: string })?.method ?? "unknown" },
        "AI extraction path used",
      );
    } catch (extractError) {
      logger.error(
        { err: extractError, userId },
        "Resume extraction failed — asking user to retry",
      );
      monitoringSummary = {
        userVisibleFailure: true,
        finalOutcome: "extraction_exception",
        createdResume: false,
      };
      return {
        requestId: observationContext.requestId,
        response:
          "I'm having trouble processing your information right now. Our AI service may be temporarily unavailable. Please try again in a few minutes.",
        progress: 0,
      };
    }

    logger.info(
      {
        confidence: extractionResult.confidence,
        extractedFields: extractionResult.extractedFields,
        isComplete: extractionResult.isComplete,
      },
      "📊 Extraction Result:",
    );
    addPipelineBreadcrumb("data extraction complete", {
      confidence: extractionResult.confidence,
      fieldCount: extractionResult.extractedFields.length,
      isComplete: extractionResult.isComplete,
    });

    // Step 2: Initialize conversation manager with ACCUMULATED data.
    // Start from previous sessionData (if any), then layer fresh extraction
    // on top using smart merge (never overwrite populated fields with empty).
    const seedData: Partial<ResumeDataRequirements> =
      (sessionData?.collectedData as Partial<ResumeDataRequirements>) ?? {};
    const conversationManager = new ConversationManager(seedData);
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
    // Only match clear creation intent, not simple affirmatives like "yes" or "ok"
    // which could be answering a question
    const userWantsToCreate =
      /\b(create|generate|finish|done|make it|go ahead|build it|create (my |the )?resume|make (my |the )?resume|finalize)\b/i.test(
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
    // When resume_v2_writer is enabled, use structured output for guaranteed valid JSON
    type TieredResult = Awaited<ReturnType<typeof generateTextWithTier>>;
    type LegacyResult = Awaited<ReturnType<typeof generateText>>;

    let aiResponse: TieredResult | LegacyResult;

    const geminiResponseSchema = flags.resume_v2_writer
      ? zodToGeminiSchema(AIResumeResponseSchema)
      : undefined;

    try {
      aiResponse = await generateTextWithTier({
        prompt,
        maxTokens: 4000,
        temperature: 0.7,
        userTier,
        modelId,
        jsonMode: flags.resume_v2_writer ? true : undefined,
        responseSchema: geminiResponseSchema as unknown as
          | Record<string, unknown>
          | undefined,
        observationContext,
        stage: "generation",
      });
    } catch (tieredError) {
      logger.error(
        { err: tieredError, userId, userTier, modelId },
        "Tier-based AI provider selection failed, falling back to legacy generator",
      );
      reportError(tieredError, {
        source: "resumeGenerationOrchestrator.tieredAI",
        severity: "warning",
        meta: { userId, userTier, modelId },
      });
      try {
        aiResponse = await generateText(prompt, 4000, 0.7);
        await markAIStageRecoveredWithFallback(
          observationContext,
          "generation",
        );
      } catch (legacyGenerationError) {
        monitoringSummary = {
          userVisibleFailure: true,
          finalOutcome: "generation_failed",
          createdResume: false,
        };
        throw legacyGenerationError;
      }
    }
    const normalizedAIResponse = normalizeAIResponse(aiResponse);
    const responseText = normalizedAIResponse.text;
    const responseProvider = getProviderFromAIResponse(aiResponse);
    addPipelineBreadcrumb("AI generation complete", {
      model: normalizedAIResponse.model ?? "unknown",
      responseLength: responseText.length,
      jsonMode: flags.resume_v2_writer ?? false,
    });

    // Track Billing
    await BillingService.trackUsage(
      userId,
      normalizedAIResponse.model || "default",
      {
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(responseText.length / 4),
      },
    );

    // Step 5: Check if AI indicates completion or if we have enough data
    const aiIndicatesCompletion = isCompletionResponse(responseText);

    // CRITICAL FIX: Sync generated JSON with ConversationManager
    let updatedProgress = progress;
    let generatedJson: Record<string, unknown> | null = null;

    if (flags.resume_v2_writer) {
      // With structured output enabled, try to parse the response directly as JSON first
      // (Gemini structured output returns raw JSON, no markdown fences)
      try {
        const parsed = JSON.parse(responseText);
        const validated = AIResumeResponseSchema.safeParse(parsed);
        if (validated.success) {
          generatedJson = validated.data as unknown as Record<string, unknown>;
          logger.info(
            "✅ Structured output: AI response is valid JSON matching schema",
          );
        } else {
          logger.warn(
            { errors: validated.error.flatten() },
            "⚠️ Structured output: AI returned JSON but schema validation failed, falling back to regex",
          );
          generatedJson = extractResumeJSON(responseText) as unknown as Record<
            string,
            unknown
          > | null;
        }
      } catch {
        // Not raw JSON — fall back to regex extraction (legacy markdown-fenced JSON)
        logger.info(
          "📋 Falling back to regex-based JSON extraction from AI response",
        );
        generatedJson = extractResumeJSON(responseText) as unknown as Record<
          string,
          unknown
        > | null;
      }
    }

    if (generatedJson) {
      logger.info("🧠 Syncing AI-generated JSON back to ConversationManager");
      conversationManager.updateData(generatedJson);
      conversationManager.markAsComplete();
      updatedProgress = conversationManager.getProgress();
    } else if (!flags.resume_v2_writer) {
      logger.info(
        "🛑 resume_v2_writer disabled; using extracted conversation data only",
      );
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
      addPipelineBreadcrumb("starting resume creation", {
        completenessPercentage: updatedProgress.completenessPercentage,
        pipeline: flags.resume_v2_writer ? "v2_structured" : "v1_regex",
        hasGeneratedJson: generatedJson !== null,
      });
      try {
        let resumeData = generatedJson;
        let regenerationAttempts = 0;

        if (!resumeData) {
          resumeData = conversationManager.getData();
        } else {
          // Merge extracted conversation fields (name, email, phone, etc.)
          // with AI-generated structured data. The AI schema produces
          // summary/skills/experience/education but extraction provides
          // top-level name/email needed by contract validation.
          const extractedData = conversationManager.getData();
          resumeData = {
            ...(extractedData as Record<string, unknown>),
            ...resumeData,
          };
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
          const factualAlignment = evaluateFactualAlignment(
            candidate,
            allMessages,
          );
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

        const logGenerationSchemaFailure = async (
          validationErrors: string[],
        ): Promise<void> => {
          if (
            generationValidationFailureLogged ||
            validationErrors.length === 0
          ) {
            return;
          }

          generationValidationFailureLogged = true;
          const classification = classifyAIFailure({
            errorMessage: "Resume generation response failed schema validation",
            schemaValidationFailed: true,
            schemaErrorCount: validationErrors.length,
          });

          await persistAIFailureEvent({
            context: observationContext,
            stage: "generation",
            provider: responseProvider,
            model: normalizedAIResponse.model,
            failureCode: classification.failureCode,
            errorMessage: classification.errorMessage,
            promptPreview: prompt,
            responsePreview: responseText,
            providerErrorClass: classification.providerErrorClass,
            schemaErrorCount: validationErrors.length,
          });
        };

        if (
          !validation.valid &&
          flags.resume_v2_writer &&
          validation.errors.length > 0
        ) {
          await logGenerationSchemaFailure(validation.errors);
          const repairPrompt = buildRepairPrompt(
            responseText,
            candidateData,
            validation.errors,
            allMessages,
          );

          try {
            regenerationAttempts = 1;
            addPipelineBreadcrumb(
              "repair loop triggered",
              {
                errorCount: validation.errors.length,
                errors: validation.errors.slice(0, 5),
              },
              "warning",
            );
            await captureServerEvent(userId, "resume_repair_triggered", {
              errorCount: validation.errors.length,
              userTier,
              pipeline: flags.resume_v2_writer ? "v2_structured" : "v1_regex",
            });
            const repairResponse = await generateTextWithTier({
              prompt: repairPrompt,
              maxTokens: 2500,
              temperature: 0.2,
              userTier,
              modelId,
              observationContext,
              stage: "repair",
            });

            await BillingService.trackUsage(
              userId,
              repairResponse.model || "default",
              {
                input: Math.ceil(repairPrompt.length / 4),
                output: Math.ceil(repairResponse.text.length / 4),
              },
            );

            const repairedJson = extractResumeJSON(repairResponse.text);
            if (repairedJson) {
              resumeData = repairedJson as unknown as Record<string, unknown>;
              candidateData = repairedJson as unknown as Record<
                string,
                unknown
              >;
              validation = evaluateCandidate(candidateData);
              if (validation.valid) {
                await markAIStageRecoveredWithFallback(
                  observationContext,
                  "generation",
                );
              }
            }
          } catch (repairError) {
            logger.warn(
              { err: repairError, userId },
              "Validation repair pass failed; falling back to clarification flow",
            );
            reportError(repairError, {
              source: "resumeGenerationOrchestrator.repairLoop",
              severity: "warning",
              meta: { userId },
            });
          }
        }

        if (validation.valid && flags.resume_v2_creative_polish) {
          const polishStyle: CreativeStyle = desiredStyle || "professional";
          const polishResult = applyCreativePolish(candidateData, polishStyle);
          const polishedValidation = evaluateCandidate(
            polishResult.polishedData,
          );

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

        const qualityReport = buildQualityReport({
          schemaValid: validation.valid,
          validationErrors: validation.errors,
          regenerationAttempts,
          factualAlignmentScore: validation.factualAlignment.score,
        });

        if (!validation.valid) {
          await logGenerationSchemaFailure(validation.errors);
          logger.warn({ errors: validation.errors }, "⚠️ Validation failed");

          const safeResponse = buildClarificationMessage(
            candidateData,
            validation.errors,
          );
          monitoringSummary = {
            userVisibleFailure: false,
            finalOutcome: "clarification_required",
            createdResume: false,
          };

          return {
            requestId: observationContext.requestId,
            response: safeResponse,
            model: normalizedAIResponse.model,
            progress: Math.min(updatedProgress.completenessPercentage, 95),
            qualityReport,
            needsClarification: true,
            missingEvidenceFields: validation.errors,
            clarificationChecklist: buildClarificationChecklist(
              candidateData,
              validation.errors,
            ),
            sessionData: {
              collectedData: candidateData,
              progress: updatedProgress,
            },
          };
        }

        logger.info("✨ Creating generated resume via Service");

        const evidenceMap = buildEvidenceMap(candidateData, allMessages);
        if (creativeAnnotations.length > 0) {
          evidenceMap.creativePolishAnnotations = creativeAnnotations.slice(
            0,
            25,
          );
        }
        const generationVersion: ResumeGenerationVersion = {
          pipeline: creativePolishApplied
            ? "v2_creative"
            : flags.resume_v2_writer
              ? "v2_structured"
              : "v1_regex",
        };

        if (!shouldPersistResult) {
          monitoringSummary = {
            userVisibleFailure: false,
            finalOutcome: "preview_generated",
            createdResume: false,
          };
          return {
            requestId: observationContext.requestId,
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
        addPipelineBreadcrumb("resume created", {
          resumeId,
          numericId,
          pipeline: generationVersion.pipeline,
          regenerationAttempts,
          factualAlignmentScore: validation.factualAlignment.score,
        });
        await captureServerEvent(userId, "resume_generated", {
          resumeId,
          numericId,
          pipeline: generationVersion.pipeline,
          creativePolishApplied,
          regenerationAttempts,
          factualAlignmentScore: validation.factualAlignment.score,
          userTier,
        });
        monitoringSummary = {
          userVisibleFailure: false,
          finalOutcome: "resume_created",
          createdResume: true,
        };

        return {
          requestId: observationContext.requestId,
          response: cleanResponse,
          model: normalizedAIResponse.model,
          resumeId,
          numericId,
          created: true,
          progress: 100,
          qualityReport,
        };
      } catch (createError) {
        addPipelineBreadcrumb(
          "resume creation failed",
          {
            pipeline: flags.resume_v2_writer ? "v2_structured" : "v1_regex",
            userTier,
          },
          "error",
        );
        logger.error({ err: createError }, "❌ Error creating resume:");
        reportError(createError, {
          source: "resumeGenerationOrchestrator.createResume",
          severity: "error",
          meta: { userId, userTier },
        });
        await captureServerEvent(userId, "resume_generation_failed", {
          userTier,
          pipeline: flags.resume_v2_writer ? "v2_structured" : "v1_regex",
        });
        monitoringSummary = {
          userVisibleFailure: true,
          finalOutcome: "resume_creation_failed",
          createdResume: false,
        };
        throw createError;
      }
    }

    // Step 7: Continue conversation (not ready yet)
    monitoringSummary = {
      userVisibleFailure: false,
      finalOutcome: "conversation_continues",
      createdResume: false,
    };
    return {
      requestId: observationContext.requestId,
      response: responseText,
      model: normalizedAIResponse.model,
      progress: updatedProgress.completenessPercentage,
      sessionData: {
        collectedData: conversationManager.getData(),
        progress: updatedProgress,
      },
    };
  } finally {
    // Persist conversation session (fire-and-forget — never blocks generation)
    const now = new Date().toISOString();
    const sessionMessages: ConversationMessage[] = allMessages.map((m) => ({
      role: m.isUser ? ("user" as const) : ("assistant" as const),
      content: m.content,
      timestamp: m.timestamp ?? now,
    }));

    persistConversationSession({
      sessionId: observationContext.requestId,
      userId,
      resumeId: undefined, // Updated below if created
      numericResumeId: undefined,
      createdAt: observationContext.startedAt?.toISOString?.() ?? now,
      updatedAt: now,
      turnCount: sessionMessages.length,
      messages: sessionMessages,
      metadata: {
        userTier,
        pipeline: flags.resume_v2_writer ? "v2_structured" : "v1_regex",
        inputSources: input.inputSources,
        model: undefined,
      },
      outcome: monitoringSummary.createdResume
        ? "resume_created"
        : monitoringSummary.finalOutcome === "conversation_continues"
          ? "in_progress"
          : "abandoned",
      expiresAt: "",
    }).catch((err) => {
      logger.error(
        { err, userId },
        "Failed to persist conversation session (non-blocking)",
      );
    });

    await persistAIRequestSummary({
      context: observationContext,
      userVisibleFailure: monitoringSummary.userVisibleFailure,
      finalOutcome: monitoringSummary.finalOutcome,
      createdResume: monitoringSummary.createdResume,
    });
  }
}
