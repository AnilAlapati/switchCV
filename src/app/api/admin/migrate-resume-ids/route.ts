import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";

/**
 * ADMIN ONLY: This endpoint migrates existing resumes to use the new ID mapping system
 * It should only be called once to set up the initial mappings
 *
 * Usage: POST /api/admin/migrate-resume-ids
 */

export async function POST() {
  try {
    console.log("[Migration] Starting resume ID mapping migration...");

    // Get all published resumes
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("published", "==", true)
      .get();

    console.log(`[Migration] Found ${resumesSnapshot.size} published resumes`);

    // Get current counter
    const counterRef = adminDb.collection("system").doc("resumeIdCounter");
    const counterDoc = await counterRef.get();
    let nextId = 1;

    if (counterDoc.exists) {
      nextId = (counterDoc.data()?.nextId || 0) + 1;
    }

    let migrated = 0;
    const mappings = [];

    // Create mappings for each resume
    for (const doc of resumesSnapshot.docs) {
      const resumeData = doc.data();

      try {
        await mapResumeId(nextId, doc.id, resumeData.userId);
        mappings.push({
          resumeId: nextId,
          documentId: doc.id,
          userId: resumeData.userId,
          title: resumeData.title || "Untitled",
        });
        migrated++;
        nextId++;
      } catch (error) {
        console.error(`[Migration] Failed to migrate resume ${doc.id}:`, error);
      }
    }

    // Update counter
    await counterRef.set({ nextId }, { merge: true });

    console.log(`[Migration] Successfully migrated ${migrated} resumes`);

    return NextResponse.json({
      message: "Migration completed",
      totalResumes: resumesSnapshot.size,
      migrated,
      mappings,
      nextId,
    });
  } catch (error) {
    console.error("[Migration] Error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
