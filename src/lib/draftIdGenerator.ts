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
 * Checks if a draft ID already exists in Firestore.
 *
 * @param draftId - The draft ID to check
 * @returns True if the ID exists, false otherwise
 */
async function draftIdExists(draftId: string): Promise<boolean> {
  const mappingDoc = await adminDb
    .collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION)
    .doc(draftId)
    .get();

  return mappingDoc.exists;
}

/**
 * Generates a unique alphanumeric draft ID.
 * Retries if collision is detected (unlikely but possible).
 *
 * @returns Unique draft ID (e.g., "d7xK9mP2")
 * @throws Error if unable to generate unique ID after max retries
 */
export async function generateUniqueDraftId(): Promise<string> {
  for (let attempt = 0; attempt < DRAFT_CONFIG.MAX_ID_RETRIES; attempt++) {
    const candidateId = generateRandomId(DRAFT_CONFIG.ID_LENGTH);

    // Check for collision
    const exists = await draftIdExists(candidateId);

    if (!exists) {
      return candidateId;
    }

    // Log collision for monitoring (rare event)
    console.warn(
      `Draft ID collision detected: ${candidateId}, attempt ${attempt + 1}`
    );
  }

  throw new Error(
    `Failed to generate unique draft ID after ${DRAFT_CONFIG.MAX_ID_RETRIES} attempts`
  );
}

/**
 * Reserves a draft ID by creating a mapping document.
 * Should be called immediately after generating the ID.
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
export async function getDraftIdMapping(
  draftId: string
): Promise<{
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
