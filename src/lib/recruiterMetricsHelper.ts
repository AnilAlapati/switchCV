import { adminDb } from "@/lib/firebase-admin";

export interface RecruiterMetrics {
  totalSearches: number;
  totalProfileViews: number;
  accessRequests: {
    pending: number;
    approved: number;
    denied: number;
  };
  totalCandidatesInteracted: number;
  lastActivityAt: string;
}

/**
 * Initialize recruiter metrics for a new recruiter user
 */
export async function initializeRecruiterMetrics(userId: string) {
  try {
    const metricsRef = adminDb.collection("recruiterMetrics").doc(userId);
    const doc = await metricsRef.get();

    if (!doc.exists) {
      await metricsRef.set({
        totalSearches: 0,
        totalProfileViews: 0,
        accessRequests: {
          pending: 0,
          approved: 0,
          denied: 0,
        },
        totalCandidatesInteracted: 0,
        lastActivityAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error initializing recruiter metrics:", error);
  }
}

/**
 * Record a search activity by recruiter
 */
export async function recordRecruiterSearch(
  recruiterId: string,
  searchQuery: string,
  candidatesFound: number
) {
  try {
    // Get current metrics
    const metricsRef = adminDb.collection("recruiterMetrics").doc(recruiterId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    // Update metrics
    await metricsRef.set(
      {
        totalSearches: (data.totalSearches || 0) + 1,
        lastActivityAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log search activity
    await adminDb.collection("recruiterActivity").add({
      recruiterId,
      type: "search",
      searchQuery,
      candidatesFound,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording recruiter search:", error);
  }
}

/**
 * Record an access request
 */
export async function recordAccessRequest(
  recruiterId: string,
  candidateId: string,
  status: "pending" | "approved" | "denied"
) {
  try {
    const metricsRef = adminDb.collection("recruiterMetrics").doc(recruiterId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};
    const requests = data.accessRequests || {
      pending: 0,
      approved: 0,
      denied: 0,
    };

    // Update the appropriate counter
    await metricsRef.set(
      {
        accessRequests: {
          ...requests,
          [status]: (requests[status] || 0) + 1,
        },
        lastActivityAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log the request
    await adminDb.collection("recruiterActivity").add({
      recruiterId,
      candidateId,
      type: "accessRequest",
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording access request:", error);
  }
}

/**
 * Record profile view request
 */
export async function recordProfileViewRequest(
  recruiterId: string,
  candidateId: string
) {
  try {
    const metricsRef = adminDb.collection("recruiterMetrics").doc(recruiterId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    await metricsRef.set(
      {
        totalProfileViews: (data.totalProfileViews || 0) + 1,
        lastActivityAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log the activity
    await adminDb.collection("recruiterActivity").add({
      recruiterId,
      candidateId,
      type: "profileView",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording profile view:", error);
  }
}

/**
 * Update candidates interacted count
 */
export async function updateCandidatesInteracted(recruiterId: string) {
  try {
    const metricsRef = adminDb.collection("recruiterMetrics").doc(recruiterId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    await metricsRef.set(
      {
        totalCandidatesInteracted: (data.totalCandidatesInteracted || 0) + 1,
        lastActivityAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating candidates interacted:", error);
  }
}
