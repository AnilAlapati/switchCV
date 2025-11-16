import { adminDb } from "@/lib/firebase-admin";

export interface JobSeekerMetrics {
  profileViews: number;
  contactRequests: number;
  downloads: number;
  quality: number;
  lastUpdated: string | null;
}

/**
 * Initialize job seeker metrics for a new user
 */
export async function initializeJobSeekerMetrics(userId: string) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const doc = await metricsRef.get();

    if (!doc.exists) {
      await metricsRef.set({
        profileViews: 0,
        contactRequests: 0,
        downloads: 0,
        quality: 0,
        lastUpdated: null,
      });
    }
  } catch (error) {
    console.error("Error initializing job seeker metrics:", error);
  }
}

/**
 * Record a profile view
 */
export async function recordProfileView(userId: string, viewerId: string) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    await metricsRef.set(
      {
        profileViews: (data.profileViews || 0) + 1,
      },
      { merge: true }
    );

    // Log the view
    await adminDb.collection("jobSeekerActivity").add({
      userId,
      viewerId,
      type: "profileView",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording profile view:", error);
  }
}

/**
 * Record a contact request
 */
export async function recordContactRequest(userId: string, fromUserId: string) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    await metricsRef.set(
      {
        contactRequests: (data.contactRequests || 0) + 1,
      },
      { merge: true }
    );

    // Log the request
    await adminDb.collection("jobSeekerActivity").add({
      userId,
      fromUserId,
      type: "contactRequest",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording contact request:", error);
  }
}

/**
 * Record a resume download
 */
export async function recordDownload(userId: string, downloadedBy: string) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const doc = await metricsRef.get();
    const data = doc.data() || {};

    await metricsRef.set(
      {
        downloads: (data.downloads || 0) + 1,
      },
      { merge: true }
    );

    // Log the download
    await adminDb.collection("jobSeekerActivity").add({
      userId,
      downloadedBy,
      type: "download",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording download:", error);
  }
}

/**
 * Update resume quality score
 */
export async function updateResumeQuality(userId: string, quality: number) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    await metricsRef.set(
      {
        quality: Math.min(100, Math.max(0, quality)),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating resume quality:", error);
  }
}

/**
 * Update last updated timestamp
 */
export async function updateLastModified(userId: string) {
  try {
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    await metricsRef.set(
      {
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating last modified:", error);
  }
}
