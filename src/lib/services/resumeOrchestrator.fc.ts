/**
 * Resume Generation Orchestrator — Function-Calling Pipeline (v3)
 *
 * Handles resume chat turns using Gemini function-calling instead of free-text
 * JSON extraction. The model calls typed tools (set_contact_info, add_experience,
 * mark_complete, …) as it converses, eliminating the class of bugs where user
 * intent (commands, complaints, questions) is absorbed as resume data.
 *
 * Enabled via feature flag `resume_v3_function_calling`.
 */

import { randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";
import { generateTextWithTier } from "@/lib/services/aiProviderService";
import { BillingService } from "@/lib/services/billingService";
import {
  ConversationManager,
  type ResumeDataRequirements,
} from "@/lib/services/conversationManager";
import { buildFCSystemPrompt } from "@/lib/services/resumePrompts";
import {
  RESUME_TOOL_DECLARATIONS,
  applyToolCall,
} from "@/lib/services/resumeToolDefinitions";
import {
  saveGeneratedResume,
  type GeneratedResumeInput,
} from "@/lib/services/resumeService";
import {
  buildClarificationChecklist,
  buildClarificationMessage,
  buildQualityReport,
  validateStructuredResumeContract,
} from "@/lib/services/resumeGenerationQuality";
import { persistConversationSession } from "@/lib/services/conversationStorageService";
import type { ConversationMessage } from "@/lib/services/conversationStorageService";
import { captureServerEvent } from "@/lib/services/serverAnalytics";
import type {
  SyncGenerationInput,
  SyncGenerationResult,
} from "@/lib/services/resumeOrchestratorTypes";

export type { SyncGenerationInput, SyncGenerationResult };

/**
 * Process a resume chat turn using the Gemini function-calling (v3) path.
 *
 * Instead of free-text extraction, the model calls typed tools as it converses.
 * This eliminates the "UI complaint absorbed as resume data" class of bugs.
 *
 * Enabled via feature flag `resume_v3_function_calling`.
 */
export async function processFunctionCallingGeneration(
  input: SyncGenerationInput,
): Promise<SyncGenerationResult> {
  const {
    userId,
    message,
    conversationHistory,
    sessionData,
    modelId,
    userTier,
    inputSources,
    persistResult,
    requestId: providedRequestId,
    sessionId: providedSessionId,
  } = input;

  const shouldPersistResult = persistResult ?? true;
  const requestId = providedRequestId ?? randomUUID();
  const messageReceivedAt = new Date().toISOString();

  // Restore conversation state from session
  const collectedData =
    (sessionData?.collectedData as Partial<ResumeDataRequirements>) ?? {};
  const conversationManager = new ConversationManager(collectedData);
  const isFileUpload =
    Boolean(sessionData?.sourceRawText) ||
    Boolean(sessionData?.wasFileUpload) ||
    (inputSources ?? []).some((source) => ["pdf", "docx"].includes(source));
  const uploadRawText =
    typeof sessionData?.sourceRawText === "string"
      ? sessionData.sourceRawText
      : undefined;

  // Build conversation history prompt for context
  const historyText =
    conversationHistory.length > 0
      ? conversationHistory
          .map((m) => `${m.isUser ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")
      : "";

  // Detect explicit creation intent BEFORE sending to AI.
  // This lets us enforce the force-create path even when the model refuses to call
  // mark_complete (e.g. stubbornly asks for a summary despite our instructions).
  const userExplicitlyWantsToCreate =
    /\b(create|generate|finish|done|make it|go ahead|build it|create (my |the )?resume|make (my |the )?resume|finalize|create now|create resume now|generate now)\b/i.test(
      message,
    );

  const prompt = historyText
    ? `${historyText}\nUser: ${message}`
    : `User: ${message}`;

  // System prompt with injected current state
  const systemInstruction = buildFCSystemPrompt(
    JSON.stringify(conversationManager.getData() ?? {}, null, 2),
  );

  let aiResponse: {
    text: string;
    model: string;
    estimatedCost?: number;
    toolCalls?: import("@/types/ai").AIToolCall[];
  };

  try {
    aiResponse = await generateTextWithTier({
      prompt,
      systemInstruction,
      maxTokens: 1200,
      temperature: 0.5,
      userTier,
      modelId,
      tools: RESUME_TOOL_DECLARATIONS,
    });

    // Detect LLM capability gaps — logged so the system prompt can be improved
    // over time rather than writing individual rules for each edge case.
    const GAP_PHRASES =
      /\b(i can't|i cannot|i don't have access|i'm not able to|i am not able to|i have no access|i'm unable to)\b/i;
    if (GAP_PHRASES.test(aiResponse.text)) {
      logger.warn(
        {
          userId,
          requestId,
          userMessage: message,
          aiResponse: aiResponse.text,
        },
        "FC orchestrator: LLM hit a capability gap — review system prompt context",
      );
    }

    // Track usage cost (fire-and-forget — billing failure never blocks the user)
    if (aiResponse.estimatedCost) {
      BillingService.trackCost(
        userId,
        aiResponse.estimatedCost,
        "resume_chat_v3",
      ).catch((err) =>
        logger.error(
          { err, userId },
          "FC: billing trackCost failed (non-blocking)",
        ),
      );
    }
  } catch (err) {
    logger.error({ err, userId }, "FC orchestrator: AI call failed");
    return {
      requestId,
      response:
        "I'm having trouble processing that right now. Please try again in a moment.",
      progress: conversationManager.getProgress().completenessPercentage,
      sessionData: {
        collectedData: conversationManager.getData() as Record<string, unknown>,
        progress: conversationManager.getProgress(),
      },
    };
  }

  // Apply all tool calls from the model.
  // Capture result for persisting conversation after — never use return inside
  // this block directly. Assign to `result` instead; the finally block saves.
  let result: SyncGenerationResult;
  let createdResumeId: string | undefined;

  try {
    let completionTriggered = false;
    for (const toolCall of aiResponse.toolCalls ?? []) {
      const done = applyToolCall(
        conversationManager,
        toolCall.name,
        toolCall.args,
      );
      if (done) completionTriggered = true;
    }

    const updatedProgress = conversationManager.getProgress();

    // Check actual minimum data (name, email, summary) independently of whether
    // markAsComplete() was called — markAsComplete() sets hasMinimumData: true
    // unconditionally, but we must verify real fields exist before saving.
    const rawCollected = conversationManager.getData();

    // Auto-synthesize summary when it is missing but enough context exists.
    // This is the most common gap from file uploads that lack a "Summary" section.
    // We build a short generic summary from the top experience entry so the
    // pipeline is not blocked by an absent section header in the source file.
    if (
      !rawCollected.summary &&
      rawCollected.name &&
      Array.isArray(rawCollected.experience) &&
      rawCollected.experience.length > 0
    ) {
      const topRole = rawCollected.experience[0];
      const titlePart =
        topRole.title && topRole.company
          ? `${topRole.title} at ${topRole.company}`
          : topRole.title || topRole.company || "professional";
      const skillsPart =
        Array.isArray(rawCollected.skills) && rawCollected.skills.length > 0
          ? ` with expertise in ${rawCollected.skills.slice(0, 3).join(", ")}`
          : "";
      conversationManager.updateData({
        summary: `Experienced ${titlePart}${skillsPart}. Dedicated professional with a track record of delivering results.`,
      });
      logger.info(
        { userId, requestId },
        "FC orchestrator: auto-synthesized summary from experience (source file had no Summary section)",
      );
    }

    // After auto-synthesis summary may now be present — re-read.
    const finalCollected = conversationManager.getData();
    const hasActualMinimumData = Boolean(
      rawCollected.name &&
      rawCollected.email &&
      // Accept auto-synthesized summary OR raw experience entries as substitute
      (finalCollected.summary ||
        (Array.isArray(rawCollected.experience) &&
          rawCollected.experience.length > 0)),
    );

    // Force-create path: user explicitly said "create" but the AI model
    // failed to call mark_complete (e.g. asked for summary instead).
    // If minimum data is available, honour the user's explicit intent.
    if (
      !completionTriggered &&
      userExplicitlyWantsToCreate &&
      hasActualMinimumData
    ) {
      completionTriggered = true;
      logger.info(
        { userId, requestId },
        "FC orchestrator: force-create path — explicit user intent + minimum data present",
      );
    }

    // If mark_complete was called and we have minimum data, save the resume
    if (completionTriggered && hasActualMinimumData) {
      const resumeData = conversationManager.getData() as Record<
        string,
        unknown
      >;

      const contractErrors = validateStructuredResumeContract(resumeData, {
        strictMode: false,
      });

      if (contractErrors.length > 0) {
        result = {
          requestId,
          response: buildClarificationMessage(resumeData, contractErrors),
          progress: Math.min(updatedProgress.completenessPercentage, 95),
          needsClarification: true,
          missingEvidenceFields: contractErrors,
          clarificationChecklist: buildClarificationChecklist(
            resumeData,
            contractErrors,
          ),
          sessionData: {
            collectedData: resumeData,
            progress: updatedProgress,
          },
        };
      } else if (!shouldPersistResult) {
        result = {
          requestId,
          response: "Preview generated successfully",
          created: false,
          progress: 100,
          previewData: resumeData as GeneratedResumeInput,
          sessionData: {
            collectedData: resumeData,
            progress: updatedProgress,
          },
        };
      } else {
        const { resumeId, numericId } = await saveGeneratedResume(
          userId,
          resumeData as GeneratedResumeInput,
          {
            qualityReport: buildQualityReport({
              schemaValid: true,
              validationErrors: [],
            }),
            generationVersion: { pipeline: "v3_function_calling" },
            sourceContext:
              isFileUpload && uploadRawText
                ? {
                    type: "upload" as const,
                    rawText: uploadRawText,
                  }
                : {
                    type: "chat" as const,
                    chatSummary: [
                      ...conversationHistory,
                      { content: message, isUser: true },
                    ]
                      .filter((m) => m.isUser)
                      .map((m) => m.content)
                      .join("\n\n")
                      .slice(0, 6_000),
                  },
          },
        );

        await captureServerEvent(userId, "resume_generated", {
          resumeId,
          numericId,
          pipeline: "v3_function_calling",
          userTier,
        });

        createdResumeId = resumeId;
        result = {
          requestId,
          response: "One moment, I'm finalizing your resume...",
          model: aiResponse.model,
          resumeId,
          numericId,
          created: true,
          progress: 100,
          sessionData: {
            collectedData: resumeData,
            progress: updatedProgress,
          },
        };
      }
    } else if (completionTriggered && !hasActualMinimumData) {
      // mark_complete triggered but truly missing required fields
      const missingMinimum: string[] = [];
      if (!rawCollected.name) missingMinimum.push("Name is required");
      if (!rawCollected.email) missingMinimum.push("Email is required");
      // Summary is no longer required if experience entries are present
      if (
        !finalCollected.summary &&
        !(
          Array.isArray(rawCollected.experience) &&
          rawCollected.experience.length > 0
        )
      ) {
        missingMinimum.push(
          "Please provide a brief professional summary or at least one work experience entry.",
        );
      }

      result = {
        requestId,
        response: buildClarificationMessage(
          rawCollected as Record<string, unknown>,
          missingMinimum,
        ),
        progress: updatedProgress.completenessPercentage,
        needsClarification: true,
        missingEvidenceFields: missingMinimum,
        clarificationChecklist: missingMinimum,
        sessionData: {
          collectedData: rawCollected as Record<string, unknown>,
          progress: updatedProgress,
        },
      };
    } else {
      // Conversation continues — return AI text response
      result = {
        requestId,
        response: aiResponse.text || "Could you tell me more?",
        model: aiResponse.model,
        progress: updatedProgress.completenessPercentage,
        sessionData: {
          collectedData: conversationManager.getData() as Record<
            string,
            unknown
          >,
          progress: updatedProgress,
        },
      };
    }
  } catch (saveErr) {
    logger.error(
      { err: saveErr, userId },
      "FC orchestrator: processing failed",
    );
    throw saveErr;
  } finally {
    // Always persist the full conversation turn to Firestore for debugging/analysis
    const now = new Date().toISOString();
    const allTurns: ConversationMessage[] = [
      ...conversationHistory.map((m) => ({
        role: m.isUser ? ("user" as const) : ("assistant" as const),
        content: m.content,
        timestamp: (m as { timestamp?: string }).timestamp ?? now,
      })),
      { role: "user" as const, content: message, timestamp: messageReceivedAt },
    ];
    if (aiResponse.text) {
      allTurns.push({
        role: "assistant" as const,
        content: aiResponse.text,
        timestamp: now,
      });
    }

    // Fire-and-forget: observability write — must never block the HTTP response.
    void persistConversationSession({
      sessionId: providedSessionId ?? requestId,
      userId,
      resumeId: createdResumeId,
      createdAt: now,
      updatedAt: now,
      turnCount: allTurns.length,
      messages: allTurns,
      collectedData: conversationManager.getData() as Record<string, unknown>,
      metadata: {
        userTier: userTier ?? "free",
        pipeline: "v3_function_calling",
        model: aiResponse.model,
      },
      outcome: createdResumeId ? "resume_created" : "in_progress",
      expiresAt: "",
    });
  }

  return result!;
}
