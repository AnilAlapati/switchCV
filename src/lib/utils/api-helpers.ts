import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Verifies the authentication token from the request headers.
 * Returns the user ID if successful, or an error response if not.
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<{ userId?: string; error?: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { userId: decodedToken.uid };
  } catch (authError) {
    console.error("Auth verification failed:", authError);
    return {
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

/**
 * Fetches a resume document by ID, checking both 'resumes' and 'resumeProfiles' collections.
 * Returns the document reference, snapshot, and data if found, or null if not.
 */
export async function fetchResumeDocument(id: string) {
  // 1. Try to fetch from 'resumes' collection (new system)
  let docRef = adminDb.collection("resumes").doc(id);
  let docSnap = await docRef.get();

  // 2. Fallback to 'resumeProfiles' (legacy)
  if (!docSnap.exists) {
    docRef = adminDb.collection("resumeProfiles").doc(id);
    docSnap = await docRef.get();
  }

  if (!docSnap.exists) {
    return null;
  }

  return { docRef, docSnap, data: docSnap.data() };
}

/**
 * Standardized API error handler.
 * Logs the error and returns a JSON response with the appropriate status code.
 */
export function handleApiError(
  error: unknown,
  message = "Internal server error",
  status = 500
) {
  if (status >= 500) {
    console.error(`API Error: ${message}`, error);
  } else {
    console.warn(`API Warning (${status}): ${message}`, error);
  }

  return NextResponse.json(
    {
      error: message,
      details:
        error instanceof Error
          ? error.message
          : error
          ? String(error)
          : undefined,
    },
    { status }
  );
}

/**
 * Verifies that the authenticated user owns the resume.
 * Returns the resume data if successful, or an error response if not.
 */
export async function verifyResumeOwnership(
  request: NextRequest,
  resumeId: string
): Promise<
  | {
      success: true;
      userId: string;
      resumeData: any;
      docRef: FirebaseFirestore.DocumentReference;
    }
  | { success: false; error: NextResponse }
> {
  // 1. Authenticate
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) {
    return { success: false, error: authError };
  }

  // 2. Fetch Resume
  const resumeDoc = await fetchResumeDocument(resumeId);
  if (!resumeDoc) {
    return {
      success: false,
      error: NextResponse.json({ error: "Resume not found" }, { status: 404 }),
    };
  }

  const { docRef, data: resumeData } = resumeDoc;

  // 3. Verify Ownership
  if (resumeData?.userId !== userId) {
    // Optional: Check for admin role here if needed, but for now strict ownership
    return {
      success: false,
      error: NextResponse.json({ error: "Permission denied" }, { status: 403 }),
    };
  }

  return { success: true, userId: userId!, resumeData, docRef };
}
