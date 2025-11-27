/**
 * Draft ID Generator
 *
 * Generates unique alphanumeric IDs for draft resumes.
 * Uses a collision-resistant approach with Firestore verification.
 *
 * @module lib/draftIdGenerator
 */

import { adminDb } from "@/lib/firebase-admin";
import { DRAFT_CONFIG } from "@/config/constants";
import { logger } from "@/lib/logger";

/**
 * Generates a random alphanumeric string of specified length.
 * Uses a character set that excludes ambiguous characters (0, O, 1, l, I).
 *
 * @param length - Length of the ID to generate
 * @returns Random alphanumeric string
 */
function generateRandomId(length: number): string {
  const charset = DRAFT_CONFIG.ID_CHARSET;
  let result = "";

  // Use crypto for better randomness when available
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }

  return result;
}

/**
 * Generates a unique alphanumeric draft ID using atomic transaction.
 * Uses Firestore transaction to prevent race conditions between
 * checking if ID exists and reserving it.
 *
 * @returns Unique draft ID (e.g., "d7xK9mP2")
 * @throws Error if unable to generate unique ID after max retries
 */
export async function generateUniqueDraftId(): Promise<string> {
  for (let attempt = 0; attempt < DRAFT_CONFIG.MAX_ID_RETRIES; attempt++) {
    const candidateId = generateRandomId(DRAFT_CONFIG.ID_LENGTH);

    // Use transaction to atomically check-and-reserve
    // This prevents race conditions where two requests could get the same ID
    const reserved = await adminDb.runTransaction(async (transaction) => {
      const mappingRef = adminDb
        .collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION)
        .doc(candidateId);
      const mappingDoc = await transaction.get(mappingRef);

      if (mappingDoc.exists) {
        // ID already taken, will retry with new ID
        return false;
      }

      // Reserve the ID atomically within the transaction
      // Note: We set a placeholder that will be updated by reserveDraftId
      transaction.set(mappingRef, {
        draftId: candidateId,
        reserved: true,
        reservedAt: new Date().toISOString(),
      });

      return true;
    });

    if (reserved) {
      return candidateId;
    }

    // Log collision for monitoring (rare event)
    logger.warn(
      { candidateId, attempt: attempt + 1 },
      "Draft ID collision detected"
    );
  }

  throw new Error(
    `Failed to generate unique draft ID after ${DRAFT_CONFIG.MAX_ID_RETRIES} attempts`
  );
}

/**
 * Reserves a draft ID by updating the mapping document with full details.
 * Should be called immediately after generating the ID.
 * The ID is already atomically reserved by generateUniqueDraftId.
 *
 * @param draftId - The draft ID to reserve
 * @param userId - The user ID who owns this draft
 * @param resumeId - The associated resume ID (null for new resumes)
 */
export async function reserveDraftId(
  draftId: string,
  userId: string,
  resumeId: number | null
): Promise<void> {
  // Update the placeholder created by generateUniqueDraftId with full details
  await adminDb
    .collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION)
    .doc(draftId)
    .set({
      draftId,
      userId,
      resumeId,
      createdAt: new Date().toISOString(),
    });
}

/**
 * Releases a draft ID mapping when draft is deleted or published.
 *
 * @param draftId - The draft ID to release
 */
export async function releaseDraftId(draftId: string): Promise<void> {
  await adminDb
    .collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION)
    .doc(draftId)
    .delete();
}

/**
 * Gets the draft ID mapping information.
 *
 * @param draftId - The draft ID to look up
 * @returns Mapping info or null if not found
 */
export async function getDraftIdMapping(draftId: string): Promise<{
  userId: string;
  resumeId: number | null;
  createdAt: string;
} | null> {
  const mappingDoc = await adminDb
    .collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION)
    .doc(draftId)
    .get();

  if (!mappingDoc.exists) {
    return null;
  }

  const data = mappingDoc.data();
  return {
    userId: data?.userId || "",
    resumeId: data?.resumeId || null,
    createdAt: data?.createdAt || "",
  };
}
