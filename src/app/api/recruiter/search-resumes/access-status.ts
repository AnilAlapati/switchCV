import { adminDb } from "@/lib/firebase-admin";

export type AccessStatus = "none" | "pending" | "approved" | "denied";
export type AccessStatusMap = Map<string, AccessStatus>;

const STATUS_PRIORITY: Record<AccessStatus, number> = {
  none: 0,
  denied: 1,
  pending: 2,
  approved: 3,
};

async function fetchAccessStatusFromDb(
  resumeId: string,
  recruiterId: string
): Promise<AccessStatus> {
  try {
    const resumeCollection = adminDb.collection("resumes");
    const resumeDocRef =
      typeof resumeCollection.doc === "function"
        ? resumeCollection.doc(resumeId)
        : null;

    if (!resumeDocRef) return "none";

    // 1. Check for valid access grants first
    const grantsCollection = resumeDocRef.collection("accessGrants");
    const grantsSnapshot = await grantsCollection
      .where("toUserId", "==", recruiterId)
      .get();

    const now = new Date();
    const hasValidGrant = grantsSnapshot.docs.some((doc) => {
      const data = doc.data();
      // If expiresAt is null/undefined, it's forever
      if (!data.expiresAt) return true;

      const expiresAt = data.expiresAt.toDate
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);

      return expiresAt > now;
    });

    if (hasValidGrant) return "approved";

    // 2. If no valid grant, check requests
    const accessCollection = resumeDocRef.collection("accessRequests");
    const requests = await accessCollection
      ?.where("fromUserId", "==", recruiterId)
      .get();

    if (!requests || requests.empty) return "none";

    const statuses = requests.docs.map((doc) => doc.data().status);

    // Note: We ignore "approved" in requests because if it was approved
    // but we didn't find a valid grant above, it means it has expired.

    if (statuses.includes("pending")) return "pending";
    if (statuses.includes("denied")) return "denied";

    return "none";
  } catch (error) {
    console.error("Error checking access status:", error);
    return "none";
  }
}

function resolveStatusFromMap(
  resumeId: string,
  recruiterId: string,
  accessStatusMap?: AccessStatusMap
) {
  if (accessStatusMap) {
    return accessStatusMap.get(resumeId) ?? "none";
  }

  return fetchAccessStatusFromDb(resumeId, recruiterId);
}

export async function buildAccessStatusMap(
  recruiterId: string
): Promise<AccessStatusMap> {
  const statusMap: AccessStatusMap = new Map();

  if (!recruiterId) {
    return statusMap;
  }

  // collectionGroup is not available in some test environments; fall back to empty map
  if (typeof (adminDb as any)?.collectionGroup !== "function") {
    return statusMap;
  }

  try {
    // 1. Populate from requests (pending/denied only)
    const requestsSnapshot = await adminDb
      .collectionGroup("accessRequests")
      .where("fromUserId", "==", recruiterId)
      .get();

    requestsSnapshot.forEach((doc) => {
      const data = doc.data() || {};
      const rawStatus = (data.status as AccessStatus) || "none";
      const resumeId = (doc as any)?.ref?.parent?.parent?.id as
        | string
        | undefined;

      if (!resumeId) return;

      // We only care about pending or denied from requests
      // Approved requests are handled by grants
      if (rawStatus === "approved") return;

      const existing = statusMap.get(resumeId) || "none";
      // Only set if higher priority (e.g. pending > denied > none)
      if (STATUS_PRIORITY[rawStatus] > STATUS_PRIORITY[existing]) {
        statusMap.set(resumeId, rawStatus);
      }
    });

    // 2. Populate from grants (approved)
    const grantsSnapshot = await adminDb
      .collectionGroup("accessGrants")
      .where("toUserId", "==", recruiterId)
      .get();

    const now = new Date();

    grantsSnapshot.forEach((doc) => {
      const data = doc.data();
      const resumeId = (doc as any)?.ref?.parent?.parent?.id as
        | string
        | undefined;

      if (!resumeId) return;

      let isValid = false;
      if (!data.expiresAt) {
        isValid = true;
      } else {
        const expiresAt = data.expiresAt.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        if (expiresAt > now) {
          isValid = true;
        }
      }

      if (isValid) {
        statusMap.set(resumeId, "approved");
      }
    });
  } catch (error) {
    console.error("Failed to build access status map:", error);
  }

  return statusMap;
}

export async function getAccessStatus(
  resumeId: string,
  recruiterId: string,
  accessStatusMap?: AccessStatusMap
) {
  return resolveStatusFromMap(resumeId, recruiterId, accessStatusMap);
}
