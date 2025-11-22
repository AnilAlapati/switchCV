import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
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
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let requestUserId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      requestUserId = decodedToken.uid;
    } catch (error) {
      console.error("Failed to verify auth token for edit chat GET:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

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
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
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
    console.error("Error in resume edit chat GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let requestUserId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      requestUserId = decodedToken.uid;
    } catch (error) {
      console.error("Failed to verify auth token for edit chat POST:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body: ResumeChatRequest = await request.json();
    const { message, conversationHistory = [], sessionData } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
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
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
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

    const mergedResume = mergeProfileIntoResume(resumeData, updatedProfile);
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

    try {
      await adminDb
        .collection("users")
        .doc(ownerId)
        .collection("resumes")
        .doc(id)
        .set(
          {
            ...sanitizedUpdate,
            updatedAt: timestamp,
            lastUpdatedAt: timestamp,
            userId: ownerId,
            numericId: resumeData.numericId,
            isPublic: resumeData.isPublic,
            visibility: resumeData.visibility,
          },
          { merge: true }
        );
    } catch (subError) {
      console.error("Failed to update user resume subcollection:", subError);
    }

    try {
      await adminDb
        .collection("allResumes")
        .doc(id)
        .set(
          {
            title: sanitizedUpdate.title ?? resumeData.title,
            updatedAt: timestamp,
            userId: ownerId,
            numericId: resumeData.numericId,
            isPublic: resumeData.isPublic,
          },
          { merge: true }
        );
    } catch (globalError) {
      console.error("Failed to update allResumes index:", globalError);
    }

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
    console.error("Error handling resume edit chat:", error);
    return NextResponse.json(
      {
        error: "Failed to process resume edit",
      },
      { status: 500 }
    );
  }
}
