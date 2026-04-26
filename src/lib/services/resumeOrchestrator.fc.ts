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
    persistResult,
    requestId: providedRequestId,
    sessionId: providedSessionId,
  } = input;

  const shouldPersistResult = persistResult ?? true;
  const requestId = providedRequestId ?? randomUUID();

  // Restore conversation state from session
  const collectedData =
    (sessionData?.collectedData as Partial<ResumeDataRequirements>) ?? {};
  const conversationManager = new ConversationManager(collectedData);

  // Build conversation history prompt for context
  const historyText =
    conversationHistory.length > 0
      ? conversationHistory
          .map((m) => `${m.isUser ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")
      : "";

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
    const hasActualMinimumData = Boolean(
      rawCollected.name && rawCollected.email && rawCollected.summary,
    );

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
      // mark_complete triggered but missing required fields
      const missingMinimum: string[] = [];
      if (!rawCollected.name) missingMinimum.push("Name is required");
      if (!rawCollected.email) missingMinimum.push("Email is required");
      if (!rawCollected.summary)
        missingMinimum.push("Professional summary is required");

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
      { role: "user" as const, content: message, timestamp: now },
    ];
    if (aiResponse.text) {
      allTurns.push({
        role: "assistant" as const,
        content: aiResponse.text,
        timestamp: now,
      });
    }

    await persistConversationSession({
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
