/**
 * Draft Resume Service
 *
 * Manages the lifecycle of draft resumes before publishing.
 * Drafts are private, editable versions that users can review
 * before making them searchable by recruiters.
 *
 * @module lib/services/draftService
 */

import { adminDb } from "@/lib/firebase-admin";
import { DRAFT_CONFIG } from "@/config/constants";
import {
  generateUniqueDraftId,
  reserveDraftId,
  getDraftIdMapping,
} from "@/lib/draftIdGenerator";
import type { DraftResume, ResumeProfile } from "@/types";

/**
 * Creates a new draft resume for a user.
 * Enforces one-draft-at-a-time rule for v1.
 *
 * @param userId - The user creating the draft
 * @param profile - The resume profile content
 * @param resumeId - Associated numeric ID if editing an existing published resume
 * @returns The created draft with its unique ID
 * @throws Error if user already has an active draft
 */
export async function createDraft(
  userId: string,
  profile: ResumeProfile,
  resumeId: number | null = null
): Promise<DraftResume> {
  // Check if user already has an active draft (v1: one draft at a time)
  const existingDraft = await getUserActiveDraft(userId);
  if (existingDraft) {
    throw new Error(
      `User already has an active draft: ${existingDraft.draftId}. ` +
        `Please publish or delete it before creating a new one.`
    );
  }

  // Generate unique draft ID
  const draftId = await generateUniqueDraftId();

  // Reserve the ID
  await reserveDraftId(draftId, userId, resumeId);

  const now = new Date().toISOString();

  const draft: DraftResume = {
    draftId,
    userId,
    resumeId,
    profile,
    createdAt: now,
    updatedAt: now,
  };

  // Save draft to Firestore
  await adminDb.collection(DRAFT_CONFIG.COLLECTION).doc(draftId).set(draft);

  return draft;
}

/**
 * Retrieves a draft by its ID.
 * Verifies ownership before returning.
 *
 * @param draftId - The draft ID to retrieve
 * @param userId - The requesting user's ID (for ownership verification)
 * @returns The draft or null if not found/not owned
 */
export async function getDraft(
  draftId: string,
  userId: string
): Promise<DraftResume | null> {
  const draftDoc = await adminDb
    .collection(DRAFT_CONFIG.COLLECTION)
    .doc(draftId)
    .get();

  if (!draftDoc.exists) {
    return null;
  }

  const draft = draftDoc.data() as DraftResume;

  // Verify ownership
  if (draft.userId !== userId) {
    return null;
  }

  return draft;
}

/**
 * Gets the user's active draft (if any).
 * Used to enforce one-draft-at-a-time rule.
 *
 * @param userId - The user ID to check
 * @returns The active draft or null if none exists
 */
export async function getUserActiveDraft(
  userId: string
): Promise<DraftResume | null> {
  const draftsSnapshot = await adminDb
    .collection(DRAFT_CONFIG.COLLECTION)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (draftsSnapshot.empty) {
    return null;
  }

  return draftsSnapshot.docs[0].data() as DraftResume;
}

/**
 * Updates an existing draft.
 * Verifies ownership before updating.
 *
 * @param draftId - The draft ID to update
 * @param userId - The requesting user's ID (for ownership verification)
 * @param updates - Partial updates to apply to the profile
 * @returns The updated draft
 * @throws Error if draft not found or not owned by user
 */
export async function updateDraft(
  draftId: string,
  userId: string,
  updates: Partial<ResumeProfile>
): Promise<DraftResume> {
  const existingDraft = await getDraft(draftId, userId);

  if (!existingDraft) {
    throw new Error(`Draft not found or access denied: ${draftId}`);
  }

  const now = new Date().toISOString();

  // Merge updates into profile
  const updatedProfile = {
    ...existingDraft.profile,
    ...updates,
    lastUpdatedAt: now,
  };

  const updatedDraft: DraftResume = {
    ...existingDraft,
    profile: updatedProfile,
    updatedAt: now,
  };

  await adminDb
    .collection(DRAFT_CONFIG.COLLECTION)
    .doc(draftId)
    .set(updatedDraft);

  return updatedDraft;
}

/**
 * Deletes a draft and releases its ID.
 * Verifies ownership before deleting.
 *
 * @param draftId - The draft ID to delete
 * @param userId - The requesting user's ID (for ownership verification)
 * @throws Error if draft not found or not owned by user
 */
export async function deleteDraft(
  draftId: string,
  userId: string
): Promise<void> {
  const existingDraft = await getDraft(draftId, userId);

  if (!existingDraft) {
    throw new Error(`Draft not found or access denied: ${draftId}`);
  }

  // Use batch to ensure atomicity
  const batch = adminDb.batch();

  // Delete the draft document
  batch.delete(adminDb.collection(DRAFT_CONFIG.COLLECTION).doc(draftId));

  // Release the draft ID mapping
  batch.delete(
    adminDb.collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION).doc(draftId)
  );

  await batch.commit();
}

/**
 * Validates that a draft ID exists and belongs to the specified user.
 *
 * @param draftId - The draft ID to validate
 * @param userId - The expected owner's user ID
 * @returns True if valid, false otherwise
 */
export async function validateDraftOwnership(
  draftId: string,
  userId: string
): Promise<boolean> {
  const mapping = await getDraftIdMapping(draftId);

  if (!mapping) {
    return false;
  }

  return mapping.userId === userId;
}
