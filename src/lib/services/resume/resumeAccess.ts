/**
 * Resume Access Control Service
 * Handles access verification and permission checking for resumes
 */

import { adminDb } from "@/lib/firebase-admin";
import type { PublishedResume } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Checks for granular access grants (e.g. recruiters).
 */
export async function checkPrivateResumeAccess(
    resumeId: string,
    viewerId: string
): Promise<boolean> {
    try {
        const resumeRef = adminDb.collection("resumes").doc(resumeId);
        const grantsSnap = await resumeRef
            .collection("accessGrants")
            .where("toUserId", "==", viewerId)
            .limit(50)
            .get();

        if (grantsSnap.empty) return false;

        const now = new Date();
        return grantsSnap.docs.some((doc) => {
            const data = doc.data();
            if (data.toUserId !== viewerId) return false;

            // Handle Timestamp or Date string
            let expiresAt: Date | null = null;
            if (data.expiresAt?.toDate) expiresAt = data.expiresAt.toDate();
            else if (data.expiresAt) expiresAt = new Date(data.expiresAt);

            return !expiresAt || expiresAt > now;
        });
    } catch (error) {
        logger.error(
            { err: error, resumeId, viewerId },
            "Error checking access grant"
        );
        return false;
    }
}

/**
 * Retrieves a resume by ID (handling legacy vs numeric IDs).
 * Optionally checks access permissions for a specific user.
 */
export async function getResume(
    id: string,
    userId?: string
): Promise<{
    resume: PublishedResume | null;
    access: "owner" | "admin" | "granted" | "public_snapshot" | "none";
}> {
    const doc = await adminDb.collection("resumes").doc(id).get();

    // If not found, it might be a slug or legacy ID - for now assume direct ID lookup primarily
    if (!doc.exists) {
        // Try numeric ID lookup if string was passed
        // (Existing logic in some places assumes ID is a string but might be stored as numeric string)
        return { resume: null, access: "none" };
    }

    const data = doc.data();
    if (!data) return { resume: null, access: "none" };

    // Cast to PublishedResume - document existence is verified above
    const resume = data as PublishedResume;

    // 1. Owner Access
    if (userId && resume.userId === userId) {
        return { resume, access: "owner" };
    }

    // 2. Admin Access
    if (userId) {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data()?.role === "admin") {
            return { resume, access: "admin" };
        }
    }

    // 3. Explicit Access Grant
    if (userId) {
        const accessGranted = await checkPrivateResumeAccess(id, userId);
        if (accessGranted) {
            // Track view
            // Access tracking logic (async)
            return { resume, access: "granted" };
        }
    }

    // 4. Public Access
    if (
        data.isPublic ||
        data.visibility === "public" ||
        data.published === true
    ) {
        const { sanitizeResumeForPublicView } = await import(
            "@/lib/utils/resumeVisibility"
        );
        const sanitized = sanitizeResumeForPublicView(data);
        return {
            resume: {
                ...sanitized,
                isBeingEdited: resume.isBeingEdited,
            } as PublishedResume,
            access: "public_snapshot",
        };
    }

    return { resume: null, access: "none" };
}
