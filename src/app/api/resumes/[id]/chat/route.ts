import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateText } from "@/lib/services/aiGenerationService";
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
  let docRef = adminDb.collection("resumes").doc(id);
  let snapshot = await docRef.get();

  if (!snapshot.exists) {
    docRef = adminDb.collection("resumeProfiles").doc(id);
    snapshot = await docRef.get();
  }

  return { docRef, snapshot };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    const { userId: requestUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const { docRef, snapshot } = await getResumeDocument(id);
    if (!snapshot.exists) {
      const greeting = getResumeEditGreeting(false);
      return NextResponse.json(
        { resumeExists: false, greeting },
        { status: 200 }
      );
    }

    const resumeData = snapshot.data() ?? {};
    const ownerId = resumeData.userId;
    if (!ownerId || ownerId !== requestUserId) {
      return handleApiError(
        new Error("Permission denied"),
        "Permission denied",
        403
      );
    }

    const normalized = normalizeResumeForEditor(resumeData);
    const greeting = getResumeEditGreeting(
      true,
      normalized.profile.title,
      normalized.profile.personalInfo?.name
    );

    return NextResponse.json({
      resumeExists: true,
      resume: {
        ...resumeData,
        id,
      },
      snapshot: normalized,
      greeting,
      metadata: {
        numericId: resumeData.numericId ?? docRef.id,
        updatedAt: resumeData.updatedAt ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error in resume edit chat GET:");
    return handleApiError(error, "Internal server error");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    const { userId: requestUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const body: ResumeChatRequest = await request.json();
    const { message, conversationHistory = [], sessionData } = body;

    if (!message || typeof message !== "string") {
      return handleApiError(
        new Error("Message is required"),
        "Message is required",
        400
      );
    }

    const { docRef, snapshot } = await getResumeDocument(id);
    if (!snapshot.exists) {
      const fallback = getResumeEditGreeting(false);
      return NextResponse.json(
        {
          response: fallback,
          resumeMissing: true,
        },
        { status: 200 }
      );
    }

    const resumeData = snapshot.data() ?? {};
    const ownerId = resumeData.userId;
    if (!ownerId || ownerId !== requestUserId) {
      return handleApiError(
        new Error("Permission denied"),
        "Permission denied",
        403
      );
    }

    const normalized = normalizeResumeForEditor(resumeData);
    const prompt = buildResumeEditPrompt({
      userMessage: message,
      conversationHistory,
      resumeSnapshot: normalized,
      pendingSummary: sessionData?.changeSummary as string | undefined,
    });

    const aiResult = await generateText(prompt, 2600, 0.6);
    const responseText = aiResult.text;

    const completionPayload = extractResumeEditJSON(responseText);
    const isComplete =
      isResumeEditCompletion(responseText) && !!completionPayload;
    const cleanedResponse = stripEditArtifacts(responseText);

    if (!isComplete || !completionPayload) {
      return NextResponse.json({
        response:
          cleanedResponse || "Let me know what else you’d like to adjust.",
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
    if (updatedProfile.skills && Array.isArray(updatedProfile.skills)) {
      updatedProfile.skills = updatedProfile.skills.map((skill: any) => ({
        ...skill,
        visibility: skill.visibility ?? true,
      }));
    }

    const mergedResume = mergeProfileIntoResume(
      resumeData,
      updatedProfile as any
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
      { merge: true }
    );

    // Fan-out Cloud Function keeps user + global indexes in sync.

    const updatedResume = {
      ...resumeData,
      ...sanitizedUpdate,
      userId: ownerId,
      updatedAt: timestamp,
      lastUpdatedAt: timestamp,
    };

    const successMessage = completionPayload.changeSummary
      ? `${completionPayload.changeSummary} — all set!`
      : cleanedResponse || "All set! Your resume has been updated.";

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
