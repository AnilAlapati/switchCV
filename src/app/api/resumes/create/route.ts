import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { Resume } from "@/lib/resumeComparison.types";

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

interface CreateResumeRequest {
  userId: string;
  resume: Resume;
  isPublic?: boolean;
}

interface CreateResumeResponse {
  success: boolean;
  resumeId: string;
  numericId: number;
  publicUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase during request, not during build
    initializeFirebaseAdmin();

    // Parse request body
    const body = (await request.json()) as CreateResumeRequest;
    const { userId, resume, isPublic = true } = body;

    if (!userId || !resume) {
      return NextResponse.json(
        { error: "Missing required fields: userId or resume" },
        { status: 400 }
      );
    }

    // Verify authentication via ID token
    const authHeader = request.headers.get("authorization");
    const tokenUserId = await verifyAuthToken(authHeader);

    // Security: Only users can save their own resumes
    if (tokenUserId && tokenUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot save resume for another user" },
        { status: 403 }
      );
    }

    // Generate numeric ID (1-99,999,999)
    const numericId = await generateNumericResumeId();

    if (!numericId) {
      return NextResponse.json(
        { error: "Failed to generate numeric resume ID" },
        { status: 500 }
      );
    }

    // Prepare resume document
    const resumeDoc = {
      ...resume,
      userId,
      numericId,
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    };

    // Save to Firestore
    // Structure: resumes/{numericId} (Root collection for easy access by ID)
    const db = getFirestore();
    const docRef = db.collection("resumes").doc(String(numericId));

    await docRef.set(resumeDoc);

    // Also store in user's subcollection for listing
    const userResumeRef = db
      .collection("users")
      .doc(userId)
      .collection("resumes")
      .doc(String(numericId));

    await userResumeRef.set({
      ...resumeDoc,
      // We can store full data or just metadata here
    });

    // Also store in a global resumes collection for search/listing (optional, if needed separately)
    const globalResumesRef = db.collection("allResumes").doc(String(numericId));
    await globalResumesRef.set({
      userId,
      numericId,
      title: resume.title,
      isPublic: isPublic,
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Resume saved successfully`, {
      userId,
      numericId,
      resumeTitle: resume.title,
      isPublic,
    });

    const response: CreateResumeResponse = {
      success: true,
      resumeId: String(numericId),
      numericId,
      publicUrl: `/resumes/${numericId}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error creating resume:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create resume", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Verify Firebase ID token and return user ID
 * Returns null if no token, throws if invalid
 */
async function verifyAuthToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch {
    console.warn("⚠️ Invalid auth token provided");
    return null;
  }
}
