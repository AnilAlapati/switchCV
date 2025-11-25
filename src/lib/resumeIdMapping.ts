import { adminDb } from "@/lib/firebase-admin";

/**
 * Resume ID Mapping System
 * Maps user-friendly resume IDs (1, 2, 3...) to Firestore document IDs
 *
 * Structure in Firestore:
 * /system/resumeIdCounter (tracks next sequential ID)
 * /resumeIdMapping/{resumeId} -> {documentId, userId, createdAt}
 */

export async function getNextResumeId(): Promise<number> {
  const counterRef = adminDb.collection("system").doc("resumeIdCounter");
  const counterDoc = await counterRef.get();

  let nextId = 1;
  if (counterDoc.exists) {
    nextId = (counterDoc.data()?.nextId || 0) + 1;
  }

  // Increment counter
  await counterRef.set({ nextId }, { merge: true });

  return nextId;
}

export async function mapResumeId(
  resumeId: number,
  documentId: string,
  userId: string
): Promise<void> {
  await adminDb.collection("resumeIdMapping").doc(resumeId.toString()).set({
    documentId,
    userId,
    resumeId,
    createdAt: new Date().toISOString(),
  });
}

export async function getDocumentIdFromResumeId(
  resumeId: number | string
): Promise<{ documentId: string; userId: string } | null> {
  const mappingDoc = await adminDb
    .collection("resumeIdMapping")
    .doc(resumeId.toString())
    .get();

  if (!mappingDoc.exists) {
    return null;
  }

  const data = mappingDoc.data();
  return {
    documentId: data?.documentId || "",
    userId: data?.userId || "",
  };
}

export async function getResumeIdFromDocumentId(
  documentId: string
): Promise<number | null> {
  const mappingSnapshot = await adminDb
    .collection("resumeIdMapping")
    .where("documentId", "==", documentId)
    .limit(1)
    .get();

  if (mappingSnapshot.empty) {
    return null;
  }

  const data = mappingSnapshot.docs[0].data();
  return data?.resumeId || null;
}

export async function deleteResumeIdMapping(resumeId: number): Promise<void> {
  await adminDb.collection("resumeIdMapping").doc(resumeId.toString()).delete();
}
