/**
 * Conversation Storage Service
 *
 * Persists full user ↔ AI conversation sessions during resume generation
 * so they can be retrieved for analysis, debugging, and model training.
 *
 * Storage layout: users/{userId}/conversationSessions/{sessionId}
 * Access: Admin SDK only (deny-all in Firestore rules)
 *
 * @module services/conversationStorageService
 */

import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/dal/collections";
import { removeUndefined } from "@/lib/services/aiMonitoring/types";

const RETENTION_DAYS = 90;

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ConversationSessionDoc {
  sessionId: string;
  userId: string;
  resumeId?: string;
  numericResumeId?: number;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  messages: ConversationMessage[];
  /** Structured fields extracted by the AI — used for quality checks (input vs output diff) */
  collectedData?: Record<string, unknown>;
  metadata: {
    userTier: string;
    pipeline: string;
    inputSources?: string[];
    model?: string;
  };
  outcome: "in_progress" | "resume_created" | "abandoned";
  expiresAt: string;
}

function computeExpiresAt(createdAt: string): string {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + RETENTION_DAYS);
  return date.toISOString();
}

/**
 * Persist or update a conversation session (one Firestore write).
 * Uses set-with-merge so repeated calls for the same sessionId are idempotent.
 */
export async function persistConversationSession(
  session: ConversationSessionDoc,
): Promise<void> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");

    const docRef = adminDb
      .collection(COLLECTIONS.USERS)
      .doc(session.userId)
      .collection(COLLECTIONS.CONVERSATION_SESSIONS)
      .doc(session.sessionId);

    const docData = removeUndefined({
      ...session,
      expiresAt: session.expiresAt || computeExpiresAt(session.createdAt),
    }) as ConversationSessionDoc;

    await docRef.set(docData, { merge: true });

    logger.info(
      {
        sessionId: session.sessionId,
        userId: session.userId,
        turnCount: session.turnCount,
        outcome: session.outcome,
      },
      "Conversation session persisted",
    );
  } catch (error) {
    logger.error(
      { err: error, sessionId: session.sessionId, userId: session.userId },
      "Failed to persist conversation session (non-blocking)",
    );
  }
}

/**
 * Retrieve conversation sessions for a user (for admin/training use).
 */
export async function getConversationSessions(
  userId: string,
  options?: { limit?: number },
): Promise<ConversationSessionDoc[]> {
  const { adminDb } = await import("@/lib/firebase-admin");

  const query = adminDb
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.CONVERSATION_SESSIONS)
    .orderBy("createdAt", "desc")
    .limit(options?.limit ?? 50);

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => doc.data() as ConversationSessionDoc);
}
