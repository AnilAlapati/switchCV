/**
 * Resume Embedding Service
 * Generates and saves vector embeddings for resume search
 */

import { adminDb } from "@/lib/firebase-admin";
import type { PublishedResume, Experience, Skill, Project } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Generates and saves vector embedding for a resume.
 * This effectively updates the "searchProfile" which is the text representation.
 */
export async function updateResumeEmbedding(
    resumeId: string,
    data: PublishedResume
): Promise<void> {
    const { generateEmbedding } = await import(
        "@/lib/services/aiGenerationService"
    );

    // Construct text representation
    const profile = data.profile || data;
    const parts = [
        profile.title,
        profile.summary,
        ...(profile.experience || []).map(
            (e: Experience) =>
                `${e.role || ""} at ${e.company || ""}: ${e.description || ""}`
        ),
        ...(profile.skills || []).map((s: Skill) =>
            typeof s === "string" ? s : s.name
        ),
        ...(profile.projects || []).map(
            (p: Project) => `${p.name || ""}: ${p.description || ""}`
        ),
    ].filter(Boolean);

    const searchText = parts.join("\n\n");

    if (!searchText.trim()) return;

    try {
        const embedding = await generateEmbedding(searchText);

        await adminDb.collection("resumes").doc(resumeId).update({
            embedding,
            embeddingUpdatedAt: new Date().toISOString(),
            searchProfile: searchText,
        });

        logger.info({ resumeId }, "Vector embedding updated");
    } catch (error) {
        logger.error({ err: error, resumeId }, "Failed to update embedding");
    }
}
