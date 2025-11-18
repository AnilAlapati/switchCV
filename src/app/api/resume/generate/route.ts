import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { generateText } from "@/lib/services/aiGenerationService";

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
    const { message, conversationHistory } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation context
    const context = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    // Create AI prompt for conversational resume generation
    const prompt = `You are a professional AI Resume Assistant helping someone create their resume through conversation.

Previous conversation:
${context}

User's latest message: "${message}"

Respond as a helpful resume assistant. Ask relevant questions to gather information about their:
- Professional experience
- Education
- Skills
- Career goals
- Contact information

Keep responses conversational, friendly, and focused on building their resume. When you have enough information, suggest creating the resume.

Response:`;

    // Generate AI response
    const aiResponse = await generateText(prompt, 300, 0.8);

    // For now, just return the AI response
    // TODO: Implement resume generation when conversation is complete
    return NextResponse.json({
      response: aiResponse.text,
      model: aiResponse.model,
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
