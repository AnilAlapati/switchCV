import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { PublishedResume } from "@/types";
import {
    normalizeSkills,
    normalizeLocation,
    calculateTotalExperience,
} from "../queryParser";

/**
 * Get display name from profile (handles privacy)
 */
export function getDisplayName(
    profile: Record<string, unknown> | undefined,
): string {
    if (!profile) return "Anonymous Candidate";

    // If name is explicitly set in personalInfo
    const personalInfo = profile.personalInfo as
        | Record<string, unknown>
        | undefined;
    if (personalInfo?.name) return personalInfo.name as string;

    return "Candidate";
}

/**
 * Add search metadata to a resume (called on publish)
 * This creates indexed fields for efficient querying
 */
export async function addSearchMetadata(
    resumeId: string,
    resume: PublishedResume,
): Promise<void> {
    try {
        const { profile } = resume;

        // Extract skills names for matching
        const skillList = profile.skills.map((s) => s.name);
        const normalizedSkills = normalizeSkills(skillList);

        // Calculate total experience
        const totalExp = calculateTotalExperience(profile.experience);

        // Normalize location
        const location = normalizeLocation(profile.personalInfo?.location || "");

        const searchMetadata = {
            skills: normalizedSkills,
            experienceYears: totalExp,
            location: location,
            title: profile.title,
            updatedAt: new Date().toISOString(),
        };

        await adminDb.collection("resumes").doc(resumeId).update({
            searchMetadata,
        });

        logger.debug({ resumeId }, "Search metadata updated");
    } catch (error) {
        logger.error({ err: error, resumeId }, "Failed to add search metadata");
        throw error;
    }
}
