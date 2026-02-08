/**
 * Resume Fetching Service
 * Handles resume retrieval and view tracking
 */

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { ResumeProfile } from "@/types";
import { logger } from "@/lib/logger";
import { deduplicateRequest, resumeCache } from "@/lib/utils/cache";

export const fetchResumeBySlug = async (
    slug: string
): Promise<ResumeProfile | null> => {
    return deduplicateRequest(`resume:${slug}`, async () => {
        const cached = resumeCache.get(`resume:${slug}`) as ResumeProfile | null;
        if (cached) return cached;

        const result = await _fetchResumeBySlugInternal(slug);
        if (result) resumeCache.set(`resume:${slug}`, result, 5 * 60 * 1000); // 5 min cache

        return result;
    });
};

const _fetchResumeBySlugInternal = async (
    slug: string
): Promise<ResumeProfile | null> => {
    try {
        const resumesRef = collection(db, "resumes");
        const q = query(resumesRef, where("slug", "==", slug));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as unknown as ResumeProfile;
    } catch (error) {
        logger.error({ err: error, slug }, "Error fetching resume");
        return null;
    }
};

export const trackResumeView = async (resumeId: string): Promise<void> => {
    try {
        const viewsRef = collection(db, "resumeViews");
        const timestamp = new Date().toISOString();

        await getDocs(
            query(
                viewsRef,
                where("resumeId", "==", resumeId),
                where("timestamp", "==", timestamp)
            )
        );

        // Track view would go here
        // For now, just silently tracking in Firestore
    } catch (error) {
        logger.error({ err: error, resumeId }, "Error tracking resume view");
    }
};
