import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

/**
 * Atomically increment a metric for a job seeker.
 * This is used to maintain real-time counters without expensive aggregation queries.
 */
export async function incrementJobSeekerMetric(
  userId: string,
  metric: "profileViews" | "contactRequests" | "downloads" | "quality",
  value: number = 1
) {
  if (!userId) return;

  try {
    const ref = adminDb.collection("jobSeekerMetrics").doc(userId);

    await ref.set(
      {
        [metric]: FieldValue.increment(value),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error(
      { err: error, userId, metric, value },
      "Failed to increment job seeker metric"
    );
  }
}

/**
 * Atomically decrement a metric for a job seeker.
 */
export async function decrementJobSeekerMetric(
  userId: string,
  metric: "profileViews" | "contactRequests" | "downloads" | "quality",
  value: number = 1
) {
  if (!userId) return;

  try {
    const ref = adminDb.collection("jobSeekerMetrics").doc(userId);

    await ref.set(
      {
        [metric]: FieldValue.increment(-value),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error(
      { err: error, userId, metric, value },
      "Failed to decrement job seeker metric"
    );
  }
}

/**
 * Atomically increment a metric for a recruiter.
 */
export async function incrementRecruiterMetric(
  userId: string,
  metric:
    | "searchQueries"
    | "profilesViewed"
    | "contactRequests"
    | "resumesShortlisted",
  value: number = 1
) {
  if (!userId) return;

  try {
    const ref = adminDb.collection("recruiterMetrics").doc(userId);

    await ref.set(
      {
        [metric]: FieldValue.increment(value),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error(
      { err: error, userId, metric, value },
      "Failed to increment recruiter metric"
    );
  }
}

/**
 * Atomically update recruiter access request counts.
 */
export async function updateRecruiterAccessMetric(
  userId: string,
  status: "pending" | "approved" | "denied",
  change: number
) {
  if (!userId) return;

  try {
    const ref = adminDb.collection("recruiterMetrics").doc(userId);

    await ref.set(
      {
        [`accessRequests.${status}`]: FieldValue.increment(change),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error(
      { err: error, userId, status, change },
      "Failed to update recruiter access metric"
    );
  }
}

/**
 * Job seeker metrics type
 */
interface JobSeekerMetrics {
  profileViews?: number;
  contactRequests?: number;
  downloads?: number;
  quality?: number;
  lastUpdated?: FirebaseFirestore.Timestamp | null;
}

/**
 * Get metrics for a job seeker.
 */
export async function getJobSeekerMetrics(
  userId: string
): Promise<JobSeekerMetrics> {
  const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
  const metricsDoc = await metricsRef.get();
  const metrics = (
    metricsDoc.exists ? metricsDoc.data() : {}
  ) as JobSeekerMetrics;

  // Lazy migration: calculate contactRequests if missing
  let contactRequests = metrics?.contactRequests;
  if (contactRequests === undefined) {
    // Calculate from accessRequests for each resume
    const resumesSnap = await adminDb
      .collection("resumes")
      .where("userId", "==", userId)
      .get();

    contactRequests = 0;
    for (const resumeDoc of resumesSnap.docs) {
      const countSnap = await resumeDoc.ref
        .collection("accessRequests")
        .where("status", "==", "approved")
        .count()
        .get();
      contactRequests += countSnap.data().count;
    }

    // Save back to metrics (lazy migration)
    await metricsRef.set(
      {
        contactRequests,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return {
    ...metrics,
    contactRequests,
  };
}

/**
 * Recruiter metrics type
 */
interface RecruiterMetrics {
  totalSearches?: number;
  totalProfileViews?: number;
  accessRequests?: {
    pending: number;
    approved: number;
    denied: number;
  };
  totalCandidatesInteracted?: number;
  lastActivityAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Get metrics for a recruiter.
 */
export async function getRecruiterMetrics(
  userId: string
): Promise<RecruiterMetrics> {
  const metricsRef = adminDb.collection("recruiterMetrics").doc(userId);
  const metricsDoc = await metricsRef.get();
  const metrics = (
    metricsDoc.exists ? metricsDoc.data() : {}
  ) as RecruiterMetrics;

  // Return cached metrics immediately - no expensive calculations on the hot path
  // If accessRequests is missing, perform a lazy migration by counting them
  let accessRequests: { pending: number; approved: number; denied: number } =
    metrics?.accessRequests ?? { pending: 0, approved: 0, denied: 0 };

  if (!metrics?.accessRequests) {
    try {
      logger.info(
        { userId },
        "Performing lazy migration for recruiter access metrics"
      );

      // Count requests from collection group
      const requestsSnapshot = await adminDb
        .collectionGroup("accessRequests")
        .where("fromUserId", "==", userId)
        .get();

      // Reset counts for migration
      accessRequests = { pending: 0, approved: 0, denied: 0 };

      requestsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending") accessRequests.pending++;
        else if (data.status === "approved") accessRequests.approved++;
        else if (data.status === "denied") accessRequests.denied++;
      });

      // Also count active grants from accessGrants collection
      const grantsSnapshot = await adminDb
        .collectionGroup("accessGrants")
        .where("toUserId", "==", userId)
        .get();

      grantsSnapshot.forEach(() => {
        accessRequests.approved++;
      });

      // Save the calculated metrics back
      await metricsRef.set(
        {
          accessRequests,
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      logger.error(
        { err, userId },
        "Failed lazy migration for recruiter access metrics"
      );
      // Fallback to empty if migration fails
      accessRequests = { pending: 0, approved: 0, denied: 0 };
    }
  }

  return {
    ...metrics,
    accessRequests,
  };
}
