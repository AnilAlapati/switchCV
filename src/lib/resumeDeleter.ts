import { logger } from "@/lib/logger";
/**
 * Resume Deletion Service
 *
 * Handles safe deletion of resumes from Firestore, including:
 * - Deleting the resume document
 * - Recycling the numeric ID back to the pool
 * - Cleaning up associated data (subcollections)
 * - Error handling and rollback
 */

import { doc, deleteDoc, getDoc, collection, getDocs, writeBatch, DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addDeletedIdToPool } from "@/lib/resumeIdRecycler";

/**
 * Delete all documents in a subcollection (cascade delete helper)
 * Firestore does NOT cascade delete subcollections when parent is deleted.
 */
async function deleteSubcollection(
  parentRef: DocumentReference,
  subcollectionName: string
): Promise<number> {
  const subcollectionRef = collection(parentRef, subcollectionName);
  const snapshot = await getDocs(subcollectionRef);

  if (snapshot.empty) {
    return 0;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  logger.info(
    { subcollection: subcollectionName, count: snapshot.size },
    "🗑️ Deleted subcollection documents"
  );

  return snapshot.size;
}



/**
 * Delete a resume by document ID
 *
 * This function:
 * 1. Retrieves the resume to get its numeric ID
 * 2. Deletes the resume document from Firestore
 * 3. Adds the numeric ID to the recycling pool for reuse
 * 4. Returns success/failure status
 *
 * @param resumeDocumentId - The Firestore document ID of the resume to delete
 * @param userId - Optional userId for authorization check
 * @returns Promise<boolean> - True if deleted successfully, false otherwise
 */
export const deleteResumeById = async (
  resumeDocumentId: string,
  userId?: string
): Promise<{ success: boolean; message: string; numericId?: number }> => {
  try {
    // Step 1: Get the resume document to extract numeric ID
    const resumeRef = doc(db, "resumeProfiles", resumeDocumentId);
    const resumeSnap = await getDoc(resumeRef);

    if (!resumeSnap.exists()) {
      return {
        success: false,
        message: `❌ Resume not found with ID: ${resumeDocumentId}`,
      };
    }

    const resumeData = resumeSnap.data() as any;

    // Step 2: Optional: Check authorization (if userId provided)
    if (userId && resumeData.userId !== userId) {
      return {
        success: false,
        message: "❌ Unauthorized: You can only delete your own resumes",
      };
    }

    const numericId = resumeData.numericId;

    // Step 3: Delete subcollections first (Firestore doesn't cascade delete)
    try {
      const accessRequestsDeleted = await deleteSubcollection(resumeRef, "accessRequests");
      const accessGrantsDeleted = await deleteSubcollection(resumeRef, "accessGrants");
      if (accessRequestsDeleted > 0 || accessGrantsDeleted > 0) {
        logger.info(
          { resumeDocumentId, accessRequestsDeleted, accessGrantsDeleted },
          "🗑️ Cascade deleted resume subcollections"
        );
      }
    } catch (subcollectionError) {
      // Log but continue - parent delete is more important
      logger.warn(
        { err: subcollectionError, resumeDocumentId },
        "⚠️ Could not delete some subcollections"
      );
    }

    // Step 4: Delete the resume document
    await deleteDoc(resumeRef);
    logger.info(
      `🗑️ Resume deleted: ${resumeDocumentId} (numeric ID: ${numericId})`
    );

    // Step 4: Recycle the numeric ID back to the pool (non-blocking)
    if (numericId) {
      try {
        await addDeletedIdToPool(numericId);
      } catch (poolError) {
        // Log but don't fail the deletion if pool recycling fails
        logger.warn(
          { err: poolError },
          `⚠️ Could not recycle numeric ID ${numericId}:`
        );
      }
    }

    return {
      success: true,
      message: `✅ Resume deleted successfully (numeric ID ${numericId} recycled)`,
      numericId,
    };
  } catch (error) {
    logger.error({ err: error }, "❌ Error deleting resume:");
    return {
      success: false,
      message: `❌ Failed to delete resume: ${error instanceof Error ? error.message : "Unknown error"
        }`,
    };
  }
};

/**
 * Delete a resume by numeric ID (convenience function)
 *
 * Finds the resume by numeric ID and deletes it.
 * Useful for API endpoints that take numeric ID as parameter.
 *
 * @param numericId - The numeric ID of the resume to delete
 * @param userId - Optional userId for authorization check
 * @returns Promise<{ success: boolean; message: string; documentId?: string }>
 */
export const deleteResumeByNumericId = async (
  numericId: number,
  userId?: string
): Promise<{ success: boolean; message: string; documentId?: string }> => {
  try {
    // Query for resume with this numeric ID
    const { query, where, getDocs, collection } = await import(
      "firebase/firestore"
    );

    const resumesRef = collection(db, "resumeProfiles");
    const q = query(resumesRef, where("numericId", "==", numericId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        message: `❌ Resume not found with numeric ID: ${numericId}`,
      };
    }

    // Delete the first (and should be only) matching document
    const docSnap = querySnapshot.docs[0];
    const result = await deleteResumeById(docSnap.id, userId);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        documentId: docSnap.id,
      };
    } else {
      return result;
    }
  } catch (error) {
    logger.error({ err: error }, "❌ Error deleting resume by numeric ID:");
    return {
      success: false,
      message: `❌ Failed to delete resume: ${error instanceof Error ? error.message : "Unknown error"
        }`,
    };
  }
};

/**
 * Delete a resume by slug (for backward compatibility)
 *
 * @param slug - The slug of the resume to delete
 * @param userId - Optional userId for authorization check
 * @returns Promise<{ success: boolean; message: string; documentId?: string }>
 */
export const deleteResumeBySlug = async (
  slug: string,
  userId?: string
): Promise<{ success: boolean; message: string; documentId?: string }> => {
  try {
    const { query, where, getDocs, collection } = await import(
      "firebase/firestore"
    );

    const resumesRef = collection(db, "resumeProfiles");
    const q = query(resumesRef, where("slug", "==", slug));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        message: `❌ Resume not found with slug: ${slug}`,
      };
    }

    // Delete the first (and should be only) matching document
    const docSnap = querySnapshot.docs[0];
    const result = await deleteResumeById(docSnap.id, userId);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        documentId: docSnap.id,
      };
    } else {
      return result;
    }
  } catch (error) {
    logger.error({ err: error }, "❌ Error deleting resume by slug:");
    return {
      success: false,
      message: `❌ Failed to delete resume: ${error instanceof Error ? error.message : "Unknown error"
        }`,
    };
  }
};
