
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { RecruiterSearchResponse, SearchResult } from "@/types/recruiter";
import { getUserTier, getUserRole } from "@/lib/services/userService";
import { getRecruiterSearchLimits } from "@/lib/config.server";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { getConstants } from "@/lib/getSystemConfig";
import { ResumeSchema, UserSchema } from "@/lib/schemas/resume";

type AllowedRole = "recruiter" | "admin";

export class RecruiterService {
    /**
     * Enforce that the user has a recruiter or admin role.
     * Throws "forbidden-role" Error if not.
     */
    static async enforceRecruiterRole(userId: string): Promise<AllowedRole> {
        const role = await getUserRole(userId);
        if (role === "recruiter" || role === "admin") {
            return role;
        }
        throw new Error("forbidden-role");
    }

    /**
     * Search for candidates based on a query string.
     * Handles quota consumption, database querying, and result formatting.
     */
    static async searchCandidates(
        recruiterId: string,
        query: string
    ): Promise<RecruiterSearchResponse> {

        // 1. Enforce Role (Redundant if API does it, but good for safety)
        await this.enforceRecruiterRole(recruiterId);

        if (!query || !query.trim()) {
            throw new Error("Search query is required");
        }

        const searchQuery = query.trim();
        const searchLower = searchQuery.toLowerCase();

        // 2. Check & Consume Quota
        const tier = await getUserTier(recruiterId);
        const searchLimits = await getRecruiterSearchLimits();
        const limit = searchLimits[tier];

        try {
            await consumeQuota({
                subjectId: recruiterId,
                scope: "recruiter_search",
                limit,
                period: "monthly",
            });
        } catch (error) {
            if (error instanceof QuotaExceededError) {
                // Re-throw with a specific message or handle in API
                // Here we just re-throw to let API handle the 403
                throw error;
            }
            throw error;
        }

        const results: SearchResult[] = [];

        // 3. Search Resumes Collection
        try {
            const resumesSnapshot = await adminDb
                .collection("resumes")
                .where("published", "==", true)
                .orderBy("createdAt", "desc")
                .limit(50)
                .get();

            for (const doc of resumesSnapshot.docs) {
                const rawData = doc.data();

                // --- VALIDATION LAYER ---
                const parseResult = ResumeSchema.safeParse(rawData);

                if (!parseResult.success) {
                    // Log but don't crash for one bad record. Skipping it.
                    logger.warn({ resumeId: doc.id, errors: parseResult.error.format() }, "Skipping invalid resume in search");
                    continue;
                }

                const resumeData = parseResult.data;
                const title = resumeData.title;
                const userId = resumeData.userId;
                const skills: string[] = resumeData.skills.map((s) => {
                    if (typeof s === "string") return s;
                    return s.name;
                });

                // In-memory filtering (Firestore doesn't support substring search)
                const resumeNumber = doc.id.substring(0, 6);
                const matchesNumber = resumeNumber.includes(searchLower);
                const matchesTitle = title.toLowerCase().includes(searchLower);
                const matchesSkill = skills.some((skill: string) =>
                    skill.toLowerCase().includes(searchLower)
                );

                if (!matchesNumber && !matchesTitle && !matchesSkill) {
                    continue;
                }

                // Fetch User Info
                try {
                    const userDoc = await this.fetchUserDoc(userId);
                    const userData = userDoc?.data?.() ?? null;

                    // Validate user data if found
                    let validUser = null;
                    if (userData) {
                        const userParse = UserSchema.safeParse(userData);
                        if (userParse.success) {
                            validUser = userParse.data;
                        } else {
                            logger.warn({ userId, errors: userParse.error.format() }, "Invalid user data found during search");
                        }
                    }

                    results.push(this.buildResult(doc.id, resumeData, validUser));
                } catch (err) {
                    logger.error({ err, userId }, "Error fetching user for resume during search");
                    results.push(this.buildResult(doc.id, resumeData, null));
                }
            }

            // 4. Fallback: Search Users if no resumes found
            if (results.length === 0) {
                const usersSnapshot = await adminDb
                    .collection("users")
                    .where("publicProfile.visible", "==", true)
                    .get();

                for (const doc of usersSnapshot.docs) {
                    const rawUserData = doc.data();
                    const userParse = UserSchema.safeParse(rawUserData);

                    if (!userParse.success) continue;

                    const userData = userParse.data;
                    const displayName = userData.displayName || "";
                    const email = userData.email || "";

                    // Simple substring match on user fields
                    if (
                        displayName.toLowerCase().includes(searchLower) ||
                        email.toLowerCase().includes(searchLower)
                    ) {
                        // Get user's resumes
                        const userResumesSnapshot = await adminDb
                            .collection("resumes")
                            .where("userId", "==", doc.id)
                            .where("published", "==", true)
                            .get();

                        for (const resumeDoc of userResumesSnapshot.docs) {
                            const rawResumeData = resumeDoc.data();
                            const resumeParse = ResumeSchema.safeParse(rawResumeData);

                            if (!resumeParse.success) continue;
                            const resumeData = resumeParse.data;

                            const skillsList = resumeData.skills.map(s => typeof s === 'string' ? s : s.name);

                            results.push({
                                resumeId: resumeDoc.id,
                                title: resumeData.title,
                                userName: displayName,
                                userId: doc.id,
                                createdAt: resumeData.createdAt.toISOString(), // safe because of Zod coerce
                                skills: skillsList,
                            });
                        }
                    }
                }
            }

            // 5. Deduplicate
            const uniqueResults = Array.from(
                new Map(results.map((r) => [r.resumeId, r])).values()
            );

            const constants = await getConstants();
            const finalResults = uniqueResults.slice(0, constants.AI_SEARCH.MAX_RESULTS);

            return {
                results: finalResults,
                count: finalResults.length,
                query: searchQuery,
            };

        } catch (error) {
            logger.error({ err: error, query: searchQuery }, "Search failed in RecruiterService");
            throw error;
        }
    }

    // --- Helpers ---

    private static async fetchUserDoc(userId: string) {
        if (!userId) return null;

        const directDoc = await adminDb.collection("users").doc(userId).get();
        if (directDoc.exists) {
            return directDoc;
        }

        const fallbackSnapshot = await adminDb
            .collection("users")
            .where("uid", "==", userId)
            .limit(1)
            .get();

        return fallbackSnapshot.docs[0] ?? null;
    }

    private static buildResult(
        resumeId: string,
        resumeData: any, // Typed via Zod above, passed here
        userData: any | null // Typed via Zod above
    ): SearchResult {
        const title = resumeData.title;

        // Skills are already normalized by Zod to be array of union, but we need string[]
        const skills: string[] = resumeData.skills.map((s: any) => {
            if (typeof s === "string") return s;
            return s.name;
        }).slice(0, 10);

        // Dates are Dates objects thanks to Zod
        const createdAt = resumeData.createdAt.toISOString();

        const userName = userData?.displayName || userData?.email || "Unknown User";
        const userId = resumeData.userId || userData?.uid;

        return {
            resumeId,
            title,
            userName,
            userId,
            createdAt,
            skills,
        } as SearchResult;
    }
}
