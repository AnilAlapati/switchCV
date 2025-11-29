import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { addDeletedIdToPool } from "@/lib/resumeIdRecycler";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const body = await request.json();
    const { resumeId } = body;

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    let numericId: number | null = null;
    let deleted = false;
    let deletedFromPrimary = false;
    let legacyOwnerId: string | null = null;

    // 1. Try deleting from 'resumes' collection (new system)
    // resumeId might be the numeric ID string
    const resumeRef = adminDb.collection("resumes").doc(String(resumeId));
    const resumeSnap = await resumeRef.get();

    if (resumeSnap.exists) {
      const data = resumeSnap.data();
      if (data?.userId !== userId) {
        return handleApiError(
          null,
          "Unauthorized: You can only delete your own resumes",
          403
        );
      }

      numericId =
        data?.numericId || (Number(resumeId) ? Number(resumeId) : null);
      await resumeRef.delete();
      deleted = true;
      deletedFromPrimary = true;
    } else {
      // 2. Try deleting from 'resumeProfiles' (legacy)
      // If resumeId is numeric, we need to query
      let legacyRef;
      if (/^\d+$/.test(String(resumeId))) {
        const snapshot = await adminDb
          .collection("resumeProfiles")
          .where("numericId", "==", Number(resumeId))
          .limit(1)
          .get();

        if (!snapshot.empty) {
          legacyRef = snapshot.docs[0].ref;
          numericId = Number(resumeId);
        }
      } else {
        legacyRef = adminDb.collection("resumeProfiles").doc(String(resumeId));
      }

      if (legacyRef) {
        const legacySnap = await legacyRef.get();
        if (legacySnap.exists) {
          const data = legacySnap.data();
          if (data?.userId !== userId) {
            return handleApiError(null, "Unauthorized", 403);
          }
          if (!numericId) numericId = data?.numericId;
          legacyOwnerId = data?.userId ?? null;
          await legacyRef.delete();
          deleted = true;
        }
      }
    }

    // Primary deletes trigger Cloud Function fan-out cleanup. Only run manual
    // cleanup when removing legacy documents that do not emit events.
    if (!deletedFromPrimary && numericId) {
      const cleanupTasks: Promise<unknown>[] = [
        adminDb
          .collection("allResumes")
          .doc(String(numericId))
          .delete()
          .catch(() => undefined),
      ];

      if (legacyOwnerId) {
        cleanupTasks.push(
          adminDb
            .collection("users")
            .doc(legacyOwnerId)
            .collection("resumes")
            .doc(String(numericId))
            .delete()
            .catch(() => undefined)
        );
        cleanupTasks.push(
          adminDb
            .collection("users")
            .doc(legacyOwnerId)
            .collection("userResumes")
            .doc(String(numericId))
            .delete()
            .catch(() => undefined)
        );
      }

      await Promise.allSettled(cleanupTasks);
    }

    if (!deleted && !numericId) {
      return handleApiError(null, "Resume not found", 404);
    }

    // Recycle the ID
    if (numericId) {
      try {
        await addDeletedIdToPool(numericId);
        logger.info(`♻️ Recycled ID: ${numericId}`);
      } catch (error) {
        logger.error({ err: error }, "Failed to recycle ID:");
      }
    }

    return NextResponse.json({ success: true, numericId });
  } catch (error) {
    return handleApiError(error, "Error deleting resume");
  }
}
