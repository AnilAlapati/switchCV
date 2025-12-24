import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

/**
 * ADMIN ONLY: This endpoint migrates existing resumes to use the new ID mapping system
 * It should only be called once to set up the initial mappings
 *
 * Usage: POST /api/admin/migrate-resume-ids
 */

async function verifyAdminRole(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    return userDoc.exists && userDoc.data()?.role === "admin";
  } catch (error) {
    logger.error({ err: error, userId }, "Error verifying admin role");
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Require authentication
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    // SECURITY FIX: Require admin role
    const isAdmin = await verifyAdminRole(userId!);
    if (!isAdmin) {
      return handleApiError(null, "Forbidden: Admin access required", 403);
    }

    logger.info("[Migration] Starting resume ID mapping migration...");

    // Get all published resumes
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("published", "==", true)
      .get();

    logger.info(`[Migration] Found ${resumesSnapshot.size} published resumes`);

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
        logger.error(
          { err: error },
          `[Migration] Failed to migrate resume ${doc.id}`
        );
      }
    }

    // Update counter
    await counterRef.set({ nextId }, { merge: true });

    logger.info(`[Migration] Successfully migrated ${migrated} resumes`);

    return NextResponse.json({
      message: "Migration completed",
      totalResumes: resumesSnapshot.size,
      migrated,
      mappings,
      nextId,
    });
  } catch (error) {
    return handleApiError(error, "Migration failed");
  }
}
