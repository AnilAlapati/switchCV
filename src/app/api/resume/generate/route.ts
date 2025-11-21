import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { generateText } from "@/lib/services/aiGenerationService";
import { ConversationManager } from "@/lib/services/conversationManager";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import {
  buildConversationalPrompt,
  extractResumeJSON,
  isCompletionResponse,
} from "@/lib/services/resumePrompts";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { adminDb } from "@/lib/firebase-admin";

// Initialize Firebase Admin safely during runtime, not build time
let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized || getApps().length > 0) return;

  try {
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL
    ) {
      console.warn(
        "Firebase credentials not configured - API may not work properly"
      );
      return;
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    initialized = true;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

interface GenerateResumeRequest {
  message: string;
  conversationHistory: Array<{
    id: string;
    content: string;
    isUser: boolean;
    timestamp: string;
  }>;
  sessionData?: any; // Optional stored session data
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase during request, not during build
    initializeFirebaseAdmin();

    // Verify authentication (optional - log but don't block)
    const authHeader = request.headers.get("authorization");
    let userId = "anonymous";

    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        console.log("✅ Authenticated user:", userId);
      } catch (error) {
        console.warn(
          "⚠️ Invalid token, proceeding as anonymous:",
          error instanceof Error ? error.message : "Unknown error"
        );
        // Don't block - allow anonymous usage for now
      }
    }

    const body: GenerateResumeRequest = await request.json();
    const { message, conversationHistory, sessionData } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Step 1: Extract data from conversation history
    const extractionResult = ResumeDataExtractor.extractFromConversation([
      ...conversationHistory,
      { content: message, isUser: true },
    ]);

    console.log("📊 Extraction Result:", {
      confidence: extractionResult.confidence,
      extractedFields: extractionResult.extractedFields,
      isComplete: extractionResult.isComplete,
    });

    // Step 2: Initialize conversation manager with extracted data
    const conversationManager = new ConversationManager(
      sessionData?.collectedData || extractionResult.data
    );

    // Update with latest extraction
    conversationManager.updateData(extractionResult.data);
    const progress = conversationManager.getProgress();

    console.log("🎯 Progress:", {
      completeness: `${progress.completenessPercentage}%`,
      isReady: progress.isReadyToCreate,
      missing: progress.missingFields,
    });

    // Step 3: Build AI prompt with progress context
    const currentProgress = {
      hasName: !!conversationManager.getData().name,
      hasEmail: !!conversationManager.getData().email,
      hasExperience: !!(conversationManager.getData().experience?.length),
      hasEducation: !!(conversationManager.getData().education?.length),
      hasSkills: !!(conversationManager.getData().skills?.length),
    };

    const prompt = buildConversationalPrompt(
      message,
      conversationHistory,
      currentProgress
    );

    // Step 4: Generate AI response
    const aiResponse = await generateText(prompt, 400, 0.7);
    const responseText = aiResponse.text;

    // Step 5: Check if AI indicates completion or if we have enough data
    const aiIndicatesCompletion = isCompletionResponse(responseText);
    const shouldCreateResume =
      aiIndicatesCompletion || progress.isReadyToCreate;

    console.log("🤔 Decision:", {
      aiIndicatesCompletion,
      isReadyToCreate: progress.isReadyToCreate,
      shouldCreateResume,
    });

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
          console.warn("⚠️ Validation failed:", validation.errors);
          // Continue conversation to gather missing data
          return NextResponse.json({
            response: responseText,
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

        console.log("✨ Creating resume with ID:", resumeId);

        // Prepare resume document
        const resumeDocument = {
          id: resumeId,
          userId,
          numericId,
          title:
            `${resumeData.name || "User"}'s Resume` ||
            "AI Generated Resume",
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

        console.log("✅ Resume created successfully:", resumeId);

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
        console.error("❌ Error creating resume:", createError);
        // Fall back to continuing conversation
        return NextResponse.json({
          response:
            "I have all the information, but there was an issue creating your resume. Let me try again. " +
            responseText,
          model: aiResponse.model,
          error: "resume_creation_failed",
        });
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
    console.error("Error in resume generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
