import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import { generateText } from "@/lib/services/aiGenerationService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import {
  buildResumeEditPrompt,
  extractResumeEditJSON,
  getResumeEditGreeting,
  isResumeEditCompletion,
  stripEditArtifacts,
} from "@/lib/services/resumeEditPrompts";
import {
  mergeProfileIntoResume,
  normalizeResumeForEditor,
  sanitizeResumePayload,
} from "@/lib/utils/resumeEditor";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getTierForRole } from "@/lib/services/userService";
import { ResumeChatRequestSchema } from "@/lib/schemas/api";
import { containsPromptInjection } from "@/lib/utils/promptSafety";

interface ConversationMessage {
  id?: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
}

interface ResumeChatRequest {
  message: string;
  conversationHistory: ConversationMessage[];
  sessionData?: Record<string, unknown>;
}

async function getResumeDocument(id: string) {
  let docRef = collectionRef(COLLECTIONS.RESUMES).doc(id);
  let snapshot = await docRef.get();

  if (!snapshot.exists) {
    docRef = collectionRef(COLLECTIONS.RESUME_PROFILES).doc(id);
    snapshot = await docRef.get();
  }

  return { docRef, snapshot };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400,
      );
    }

    const { userId: requestUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    // Unified Rate Limiting
    const userRole = await getTierForRole(requestUserId!, "jobseeker");
    const rateLimitResult = await checkDistributedRateLimit(requestUserId!, {
      tier: userRole,
      scope: "chat",
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(
        new Error("Too many requests"),
        "Too many requests. Please try again later.",
        429,
      );
    }

    const { docRef, snapshot } = await getResumeDocument(id);
    if (!snapshot.exists) {
      const greeting = getResumeEditGreeting(false);
      return NextResponse.json(
        { resumeExists: false, greeting },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const resumeData = snapshot.data() ?? {};
    const ownerId = resumeData.userId;
    if (!ownerId || ownerId !== requestUserId) {
      return handleApiError(
        new Error("Permission denied"),
        "Permission denied",
        403,
      );
    }

    const normalized = normalizeResumeForEditor(resumeData);
    const greeting = getResumeEditGreeting(
      true,
      normalized.profile.title,
      normalized.profile.personalInfo?.name,
    );

    return NextResponse.json(
      {
        resumeExists: true,
        resume: {
          ...resumeData,
          id,
        },
        snapshot: normalized,
        greeting,
        sourceContext: resumeData.sourceContext ?? null,
        metadata: {
          numericId: resumeData.numericId ?? docRef.id,
          updatedAt: resumeData.updatedAt ?? null,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ err: error }, "Error in resume edit chat GET:");
    return handleApiError(error, "Internal server error");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400,
      );
    }

    const { userId: requestUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const parseResult = ResumeChatRequestSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Message is required", 400);
    }
    const {
      message,
      conversationHistory = [],
      sessionData,
    } = parseResult.data as ResumeChatRequest;

    // SECURITY: Check for prompt injection attempts
    if (containsPromptInjection(message)) {
      logger.warn(
        { userId: requestUserId },
        "Prompt injection attempt detected in resume chat",
      );
      return handleApiError(null, "Invalid characters in input", 400);
    }

    const { docRef, snapshot } = await getResumeDocument(id);
    if (!snapshot.exists) {
      const fallback = getResumeEditGreeting(false);
      return NextResponse.json(
        {
          response: fallback,
          resumeMissing: true,
        },
        { status: 200 },
      );
    }

    const resumeData = snapshot.data() ?? {};
    const ownerId = resumeData.userId;
    if (!ownerId || ownerId !== requestUserId) {
      return handleApiError(
        new Error("Permission denied"),
        "Permission denied",
        403,
      );
    }

    const normalized = normalizeResumeForEditor(resumeData);
    const storedSourceContext = resumeData.sourceContext as
      | { type: "upload" | "chat"; rawText?: string; chatSummary?: string }
      | undefined;
    const prompt = buildResumeEditPrompt({
      userMessage: message,
      conversationHistory,
      resumeSnapshot: normalized,
      pendingSummary: sessionData?.changeSummary as string | undefined,
      sourceContext: storedSourceContext ?? null,
    });

    const aiResult = await generateText(prompt, 4000, 0.6);
    const responseText = aiResult.text;

    // Track Billing
    await BillingService.trackUsage(
      requestUserId!,
      aiResult.model || "default",
      {
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(responseText.length / 4),
      },
    );

    const completionPayload = extractResumeEditJSON(responseText);
    const isComplete =
      isResumeEditCompletion(responseText) && !!completionPayload;
    const cleanedResponse = stripEditArtifacts(responseText);

    if (!isComplete || !completionPayload) {
      // Even if incomplete, ensure we strip any partial JSON or artifacts
      const safeResponse =
        cleanedResponse || "Let me know what else you’d like to adjust.";
      const finalResponse = safeResponse
        .replace(/```json[\s\S]*$/, "") // aggressive strip if it trails
        .trim();

      return NextResponse.json({
        response: finalResponse,
        model: aiResult.model,
        provider: aiResult.provider,
        completed: false,
        sessionData,
      });
    }

    const updatedProfile = completionPayload.updatedProfile;
    if (!updatedProfile || typeof updatedProfile !== "object") {
      return NextResponse.json({
        response:
          "I tried to apply the changes but the update payload looked incorrect. Could you restate what you'd like to change?",
        model: aiResult.model,
        provider: aiResult.provider,
        completed: false,
      });
    }

    // Fix for missing visibility in skills from AI response
    if ("skills" in updatedProfile && Array.isArray(updatedProfile.skills)) {
      updatedProfile.skills = (
        updatedProfile.skills as Record<string, unknown>[]
      ).map((skill) => ({
        name: (skill.name as string) || "",
        level:
          (skill.level as "advanced" | "intermediate" | "beginner") ||
          "intermediate",
        visibility: (skill.visibility as boolean) ?? true,
      }));
    }

    const mergedResume = mergeProfileIntoResume(
      resumeData,
      updatedProfile as Record<string, unknown>,
    );
    const normalizedUpdated = normalizeResumeForEditor(mergedResume);
    const sanitizedUpdate = sanitizeResumePayload(normalizedUpdated.resume);
    const timestamp = new Date().toISOString();

    await docRef.set(
      {
        ...sanitizedUpdate,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
      },
      { merge: true },
    );

    // Fan-out Cloud Function keeps user + global indexes in sync.

    const updatedResume = {
      ...resumeData,
      ...sanitizedUpdate,
      userId: ownerId,
      updatedAt: timestamp,
      lastUpdatedAt: timestamp,
    };

    // Ensure the response text doesn't contain the JSON
    const finalCleanedResponse = cleanedResponse
      .replace(/```json[\s\S]*?```/gi, "")
      .replace(/RESUME_EDIT_COMPLETE/gi, "")
      .trim();

    const successMessage = completionPayload.changeSummary
      ? `${completionPayload.changeSummary} — all set!`
      : finalCleanedResponse || "All set! Your resume has been updated.";

    return NextResponse.json({
      response: successMessage,
      model: aiResult.model,
      provider: aiResult.provider,
      completed: true,
      resume: {
        ...updatedResume,
        id,
      },
      sessionData: {
        changeSummary: completionPayload.changeSummary ?? null,
        resumeId: id,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error handling resume edit chat:");
    return handleApiError(error, "Failed to process resume edit");
  }
}
