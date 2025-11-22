import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { sanitizeResumePayload } from "@/lib/utils/resumeEditor";

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

    // 1. Try to fetch from 'resumes' collection (new system)
    let docRef = adminDb.collection("resumes").doc(id);
    let docSnap = await docRef.get();

    // 2. Fallback to 'resumeProfiles' (legacy)
    if (!docSnap.exists) {
      docRef = adminDb.collection("resumeProfiles").doc(id);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeData = docSnap.data();
    const isPublic =
      resumeData?.isPublic ||
      resumeData?.visibility === "public" ||
      resumeData?.published === true;

    // 3. Security Check
    // If public, allow access
    if (isPublic) {
      return NextResponse.json(resumeData);
    }

    // If private, verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const requestUserId = decodedToken.uid;
      const ownerId = resumeData?.userId;

      if (requestUserId !== ownerId) {
        // Check if user is admin (optional, but good for support)
        const userDoc = await adminDb
          .collection("users")
          .doc(requestUserId)
          .get();
        const userData = userDoc.data();
        if (userData?.role !== "admin") {
          return NextResponse.json(
            { error: "Permission denied" },
            { status: 403 }
          );
        }
      }
    } catch (authError) {
      console.error("Auth verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 4. Return Data
    return NextResponse.json(resumeData);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "Invalid visibility state" },
        { status: 400 }
      );
    }

    // Verify Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let requestUserId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      requestUserId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get Document Reference
    let docRef = adminDb.collection("resumes").doc(id);
    let docSnap = await docRef.get();

    // Fallback to legacy
    if (!docSnap.exists) {
      docRef = adminDb.collection("resumeProfiles").doc(id);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeData = docSnap.data();

    // Verify Ownership
    if (resumeData?.userId !== requestUserId) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Update Visibility
    await docRef.update({
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    console.error("Error updating resume visibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const resumePayload = body?.resume;

    if (!resumePayload || typeof resumePayload !== "object") {
      return NextResponse.json(
        { error: "Invalid resume payload" },
        { status: 400 }
      );
    }

    let docRef = adminDb.collection("resumes").doc(id);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = adminDb.collection("resumeProfiles").doc(id);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const existingData = docSnap.data() ?? {};
    const ownerId = existingData.userId;

    if (!ownerId || ownerId !== requestUserId) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const sanitizedResume = sanitizeResumePayload(resumePayload);
    const timestamp = new Date().toISOString();

    await docRef.set(
      {
        ...sanitizedResume,
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
            ...sanitizedResume,
            updatedAt: timestamp,
            lastUpdatedAt: timestamp,
            userId: ownerId,
            numericId: existingData.numericId,
            isPublic: existingData.isPublic,
            visibility: existingData.visibility,
          },
          { merge: true }
        );
    } catch (subcollectionError) {
      console.error(
        "Error updating user resume subcollection:",
        subcollectionError
      );
    }

    try {
      await adminDb
        .collection("allResumes")
        .doc(id)
        .set(
          {
            title: sanitizedResume.title ?? existingData.title,
            updatedAt: timestamp,
            userId: ownerId,
            numericId: existingData.numericId,
            isPublic: existingData.isPublic,
          },
          { merge: true }
        );
    } catch (globalError) {
      console.error("Error updating allResumes collection:", globalError);
    }

    const refreshedSnap = await docRef.get();
    const refreshedData = refreshedSnap.data() ?? {};

    return NextResponse.json({
      success: true,
      resume: {
        ...refreshedData,
        id,
      },
    });
  } catch (error) {
    console.error("Error updating resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
