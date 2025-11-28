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
