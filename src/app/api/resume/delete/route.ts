import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { addDeletedIdToPool } from "@/lib/resumeIdRecycler";

// Initialize Firebase Admin safely
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

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin();

    const body = await request.json();
    const { resumeId } = body;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let userId: string;
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = getFirestore();
    let numericId: number | null = null;
    let deleted = false;

    // 1. Try deleting from 'resumes' collection (new system)
    // resumeId might be the numeric ID string
    const resumeRef = db.collection("resumes").doc(String(resumeId));
    const resumeSnap = await resumeRef.get();

    if (resumeSnap.exists) {
      const data = resumeSnap.data();
      if (data?.userId !== userId) {
        return NextResponse.json(
          { error: "Unauthorized: You can only delete your own resumes" },
          { status: 403 }
        );
      }

      numericId =
        data?.numericId || (Number(resumeId) ? Number(resumeId) : null);
      await resumeRef.delete();
      deleted = true;

      // Also delete from user's subcollection if it exists
      // Structure: resumes/{userId}/resumes/{numericId}
      // Wait, create route saves to: resumes/{userId}/resumes/{numericId} AND resumes/{userId}/userResumes/{resumeId} ??
      // Let's check create route again.
      // It saves to: db.collection("resumes").doc(userId).collection("resumes").doc(String(numericId));
      // AND db.collection("allResumes").doc(String(numericId));

      // Wait, my previous analysis of create route was:
      // const docRef = db.collection("resumes").doc(userId).collection("resumes").doc(String(numericId));

      // BUT the ResumeView tries to read from: doc(db, "resumes", id)
      // This means ResumeView expects the resume to be at root level 'resumes/{id}'.

      // If create route saves to nested collection, then ResumeView is wrong OR create route is wrong.
      // Let's re-read src/app/api/resumes/create/route.ts carefully.
    } else {
      // 2. Try deleting from 'resumeProfiles' (legacy)
      // If resumeId is numeric, we need to query
      let legacyRef;
      if (/^\d+$/.test(String(resumeId))) {
        const snapshot = await db
          .collection("resumeProfiles")
          .where("numericId", "==", Number(resumeId))
          .limit(1)
          .get();

        if (!snapshot.empty) {
          legacyRef = snapshot.docs[0].ref;
          numericId = Number(resumeId);
        }
      } else {
        legacyRef = db.collection("resumeProfiles").doc(String(resumeId));
      }

      if (legacyRef) {
        const legacySnap = await legacyRef.get();
        if (legacySnap.exists) {
          const data = legacySnap.data();
          if (data?.userId !== userId) {
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 403 }
            );
          }
          if (!numericId) numericId = data?.numericId;
          await legacyRef.delete();
          deleted = true;
        }
      }
    }

    // Also delete from 'allResumes' if it exists
    if (numericId) {
      await db.collection("allResumes").doc(String(numericId)).delete();

      // Also delete from nested collection if it exists (based on create route)
      // db.collection("resumes").doc(userId).collection("resumes").doc(String(numericId)).delete();
      await db
        .collection("resumes")
        .doc(userId)
        .collection("resumes")
        .doc(String(numericId))
        .delete();
    }

    if (!deleted && !numericId) {
      // If we couldn't find it in main collections, but we have a numeric ID,
      // we should still try to recycle it if the user claims it's theirs?
      // No, that's unsafe.
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Recycle the ID
    if (numericId) {
      try {
        await addDeletedIdToPool(numericId);
        console.log(`♻️ Recycled ID: ${numericId}`);
      } catch (error) {
        console.error("Failed to recycle ID:", error);
      }
    }

    return NextResponse.json({ success: true, numericId });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
