/**
 * Smart Search Service
 * Orchestrates hybrid search using skill indexes, vector search, and caching
 * Designed for millions of resumes with cost-efficient queries
 */

import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/services/aiGenerationService";
import {
    parseSearchQuery,
    normalizeSkills,
    calculateTotalExperience,
    normalizeLocation,
    type ParsedQuery,
} from "./queryParser";
import {
    getSearchCache,
    generateQueryHash,
    invalidateCacheForResume,
} from "./searchCache";
import type { PublishedResume } from "@/types";

// Re-export for convenience
export { invalidateCacheForResume };

// Constants
const DEFAULT_LIMIT = 50;
const SKILL_SEARCH_LIMIT = 100; // Scan more for skill search, then rank
const VECTOR_SEARCH_LIMIT = 50;

export interface SmartSearchOptions {
    /** Natural language or keyword query */
    query: string;
    /** Recruiter ID for access status checks */
    recruiterId: string;
    /** Maximum results to return */
    limit?: number;
    /** Additional filters */
    filters?: {
        skills?: string[];
        location?: string;
        minExperience?: number;
        maxExperience?: number;
    };
}

export interface RankedCandidate {
    /** Resume document ID */
    resumeId: string;
    /** User ID */
    userId: string;
    /** Resume title */
    title: string;
    /** Candidate name (may be masked) */
    userName: string;
    /** Match score (0-100) */
    matchScore: number;
    /** Skills that matched the query */
    matchedSkills: string[];
    /** Explanation of why this candidate matched */
    matchReason: string;
    /** All skills on the resume */
    skills: string[];
    /** Location */
    location?: string;
    /** Years of experience */
    experienceYears?: number;
    /** When resume was created */
    createdAt: string;
}

export interface SmartSearchResult {
    /** Ranked candidate results */
    results: RankedCandidate[];
    /** Search strategy used */
    searchType: "skill" | "semantic" | "hybrid";
    /** Whether results came from cache */
    fromCache: boolean;
    /** Search execution time in ms */
    searchTimeMs: number;
    /** Total candidates scanned */
    totalScanned: number;
    /** Parsed query details */
    parsedQuery: ParsedQuery;
}

/**
 * Perform a smart search with automatic strategy selection
 */
export async function performSmartSearch(
    options: SmartSearchOptions
): Promise<SmartSearchResult> {
    const startTime = Date.now();
    const { query, recruiterId, limit = DEFAULT_LIMIT, filters } = options;

    // 1. Parse the query
    const parsedQuery = parseSearchQuery(query);

    // Merge explicit filters with parsed ones
    const mergedFilters = {
        skills: [...(parsedQuery.skills), ...(filters?.skills || [])],
        location: filters?.location || parsedQuery.location,
        minExperience: filters?.minExperience ?? parsedQuery.minExperience,
        maxExperience: filters?.maxExperience ?? parsedQuery.maxExperience,
    };

    // 2. Check cache
    const cacheKey = generateQueryHash(query, mergedFilters);
    const cache = getSearchCache();
    const cached = cache.get(cacheKey) as RankedCandidate[] | undefined;

    if (cached !== undefined) {
        logger.info({ cacheKey, resultCount: cached.length }, "Smart search cache hit");
        return {
            results: cached.slice(0, limit),
            searchType: parsedQuery.queryType,
            fromCache: true,
            searchTimeMs: Date.now() - startTime,
            totalScanned: cached.length,
            parsedQuery,
        };
    }

    // 3. Execute search based on query type
    let results: RankedCandidate[];
    let totalScanned = 0;

    switch (parsedQuery.queryType) {
        case "skill":
            const skillResult = await performSkillSearch(mergedFilters);
            results = skillResult.results;
            totalScanned = skillResult.scanned;
            break;

        case "semantic":
            const semanticResult = await performSemanticSearch(
                parsedQuery.semanticQuery,
                mergedFilters
            );
            results = semanticResult.results;
            totalScanned = semanticResult.scanned;
            break;

        case "hybrid":
        default:
            const hybridResult = await performHybridSearch(
                parsedQuery,
                mergedFilters,
                recruiterId
            );
            results = hybridResult.results;
            totalScanned = hybridResult.scanned;
            break;
    }

    // 4. Apply experience filter if specified
    if (mergedFilters.minExperience !== null || mergedFilters.maxExperience !== null) {
        results = results.filter((r) => {
            const exp = r.experienceYears ?? 0;
            if (mergedFilters.minExperience !== null && exp < mergedFilters.minExperience) {
                return false;
            }
            if (mergedFilters.maxExperience !== null && exp > mergedFilters.maxExperience) {
                return false;
            }
            return true;
        });
    }

    // 5. Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);

    // 6. Limit results
    const limitedResults = results.slice(0, limit);

    // 7. Cache results
    cache.set(cacheKey, limitedResults);

    const searchTimeMs = Date.now() - startTime;
    logger.info(
        {
            query: query.substring(0, 100),
            searchType: parsedQuery.queryType,
            resultCount: limitedResults.length,
            totalScanned,
            searchTimeMs,
        },
        "Smart search completed"
    );

    return {
        results: limitedResults,
        searchType: parsedQuery.queryType,
        fromCache: false,
        searchTimeMs,
        totalScanned,
        parsedQuery,
    };
}

/**
 * Skill-based search using Firestore indexes
 */
async function performSkillSearch(
    filters: {
        skills: string[];
        location: string | null;
        minExperience: number | null;
        maxExperience: number | null;
    }
): Promise<{ results: RankedCandidate[]; scanned: number }> {
    const normalizedSkills = filters.skills.map((s) => s.toLowerCase().trim());

    let query: FirebaseFirestore.Query = adminDb
        .collection("resumes")
        .where("published", "==", true);

    // Use skillsNormalized if available, otherwise fall back to standard query
    if (normalizedSkills.length > 0) {
        // Firestore array-contains-any supports up to 30 values
        const skillsToQuery = normalizedSkills.slice(0, 10);
        query = query.where("skillsNormalized", "array-contains-any", skillsToQuery);
    }

    query = query.limit(SKILL_SEARCH_LIMIT);

    const snapshot = await query.get();
    const results: RankedCandidate[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data() as Partial<PublishedResume>;
        // Profile can be nested under 'profile' or flat at root level
        const profile = (data.profile || data) as Record<string, unknown>;

        // Calculate match score based on skill overlap
        const rawSkills = (profile.skills || []) as (string | { name?: string })[];
        const resumeSkills = normalizeSkills(rawSkills);
        const matchedSkills = normalizedSkills.filter((s) =>
            resumeSkills.some((rs) => rs.includes(s) || s.includes(rs))
        );

        // Skip if no skill match (shouldn't happen with array-contains-any, but safety check)
        if (matchedSkills.length === 0 && normalizedSkills.length > 0) {
            continue;
        }

        // Extract personal info for location
        const personalInfo = profile.personalInfo as Record<string, string> | undefined;
        const profileLocation = personalInfo?.location || (data as Record<string, string>).location;

        // Location filter (if specified)
        if (filters.location !== null) {
            const resumeLocation = normalizeLocation(profileLocation);
            if (resumeLocation === null || !resumeLocation.includes(filters.location.toLowerCase())) {
                continue;
            }
        }

        const matchScore = calculateMatchScore(
            matchedSkills.length,
            normalizedSkills.length,
            0 // No semantic score for skill-only search
        );

        // Extract experience for years calculation
        const experience = (profile.experience || []) as Array<{ startDate?: string; endDate?: string }>;

        results.push({
            resumeId: doc.id,
            userId: data.userId || "",
            title: (profile.title as string) || "Untitled Resume",
            userName: getDisplayName(profile),
            matchScore,
            matchedSkills,
            matchReason: generateMatchReason(matchedSkills, normalizedSkills),
            skills: resumeSkills.slice(0, 10),
            location: profileLocation || undefined,
            experienceYears: calculateTotalExperience(experience),
            createdAt: data.publishedAt || data.updatedAt || new Date().toISOString(),
        });
    }

    return { results, scanned: snapshot.size };
}

/**
 * Semantic vector search using embeddings
 */
async function performSemanticSearch(
    query: string,
    filters: {
        skills: string[];
        location: string | null;
        minExperience: number | null;
        maxExperience: number | null;
    }
): Promise<{ results: RankedCandidate[]; scanned: number }> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Vector search with Firestore
    const vectorQuery = adminDb
        .collection("resumes")
        .where("published", "==", true)
        .findNearest("embedding", queryEmbedding, {
            limit: VECTOR_SEARCH_LIMIT,
            distanceMeasure: "COSINE",
        });

    const snapshot = await vectorQuery.get();
    const results: RankedCandidate[] = [];
    const normalizedSkills = filters.skills.map((s) => s.toLowerCase().trim());

    for (const doc of snapshot.docs) {
        const data = doc.data() as Partial<PublishedResume>;
        // Profile can be nested under 'profile' or flat at root level
        const profile = (data.profile || data) as Record<string, unknown>;

        // Get vector distance (lower = more similar)
        const distance = (doc as { metadata?: { distance?: number } }).metadata?.distance ?? 1;
        const semanticScore = 1 - distance; // Convert to similarity score

        // Calculate skill matches if filters provided
        const rawSkills = (profile.skills || []) as (string | { name?: string })[];
        const resumeSkills = normalizeSkills(rawSkills);
        const matchedSkills = normalizedSkills.filter((s) =>
            resumeSkills.some((rs) => rs.includes(s) || s.includes(rs))
        );

        // Extract personal info for location
        const personalInfo = profile.personalInfo as Record<string, string> | undefined;
        const profileLocation = personalInfo?.location || (data as Record<string, string>).location;

        // Location filter
        if (filters.location !== null) {
            const resumeLocation = normalizeLocation(profileLocation);
            if (resumeLocation === null || !resumeLocation.includes(filters.location.toLowerCase())) {
                continue;
            }
        }

        const matchScore = calculateMatchScore(
            matchedSkills.length,
            normalizedSkills.length,
            semanticScore
        );

        // Extract experience for years calculation
        const experience = (profile.experience || []) as Array<{ startDate?: string; endDate?: string }>;

        results.push({
            resumeId: doc.id,
            userId: data.userId || "",
            title: (profile.title as string) || "Untitled Resume",
            userName: getDisplayName(profile),
            matchScore,
            matchedSkills,
            matchReason: generateSemanticMatchReason(semanticScore, matchedSkills),
            skills: resumeSkills.slice(0, 10),
            location: profileLocation || undefined,
            experienceYears: calculateTotalExperience(experience),
            createdAt: data.publishedAt || data.updatedAt || new Date().toISOString(),
        });
    }

    return { results, scanned: snapshot.size };
}

/**
 * Hybrid search combining skill index and vector search
 */
async function performHybridSearch(
    parsedQuery: ParsedQuery,
    filters: {
        skills: string[];
        location: string | null;
        minExperience: number | null;
        maxExperience: number | null;
    },
    recruiterId: string
): Promise<{ results: RankedCandidate[]; scanned: number }> {
    // Run both searches in parallel
    const [skillResult, semanticResult] = await Promise.all([
        performSkillSearch(filters),
        performSemanticSearch(parsedQuery.semanticQuery, filters),
    ]);

    // Merge results, preferring higher scores
    const resultMap = new Map<string, RankedCandidate>();

    // Add skill results first
    for (const result of skillResult.results) {
        resultMap.set(result.resumeId, result);
    }

    // Merge semantic results
    for (const result of semanticResult.results) {
        const existing = resultMap.get(result.resumeId);
        if (existing !== undefined) {
            // Combine scores - found in both searches is a strong signal
            existing.matchScore = Math.min(
                100,
                existing.matchScore + result.matchScore * 0.5
            );
            existing.matchReason = `${existing.matchReason}. Also ranked high in semantic search.`;
        } else {
            resultMap.set(result.resumeId, result);
        }
    }

    const totalScanned = skillResult.scanned + semanticResult.scanned;

    return {
        results: Array.from(resultMap.values()),
        scanned: totalScanned,
    };
}

/**
 * Calculate overall match score
 */
function calculateMatchScore(
    skillMatches: number,
    totalSkillsQueried: number,
    semanticScore: number
): number {
    // Base semantic score (0-70 points)
    const semanticPoints = semanticScore * 70;

    // Skill match bonus (0-30 points)
    const skillMatchRatio = totalSkillsQueried > 0
        ? skillMatches / totalSkillsQueried
        : 0;
    const skillPoints = skillMatchRatio * 30;

    return Math.round(semanticPoints + skillPoints);
}

/**
 * Generate human-readable match reason for skill searches
 */
function generateMatchReason(matchedSkills: string[], queriedSkills: string[]): string {
    if (matchedSkills.length === 0) {
        return "Profile matches search criteria";
    }

    const skillStr = matchedSkills.slice(0, 3).join(", ");

    return `Matches ${matchedSkills.length}/${queriedSkills.length} skills (${skillStr})`;
}

/**
 * Generate match reason for semantic searches
 */
function generateSemanticMatchReason(
    semanticScore: number,
    matchedSkills: string[]
): string {
    const similarity = Math.round(semanticScore * 100);

    if (matchedSkills.length > 0) {
        return `${similarity}% semantic match, plus skills: ${matchedSkills.slice(0, 2).join(", ")}`;
    }

    return `${similarity}% match based on experience and background`;
}

/**
 * Get display name from profile (handles privacy)
 */
function getDisplayName(profile: Record<string, unknown> | undefined): string {
    if (profile === undefined) return "Anonymous Candidate";

    const personalInfo = profile.personalInfo as Record<string, string> | undefined;
    if (personalInfo?.name !== undefined) {
        return personalInfo.name;
    }

    return "Candidate";
}

/**
 * Add search metadata to a resume (called on publish)
 * This creates indexed fields for efficient querying
 */
export async function addSearchMetadata(
    resumeId: string,
    resume: PublishedResume
): Promise<void> {
    // Profile can be nested under 'profile' or flat at root level
    const profile = (resume.profile || resume) as unknown as Record<string, unknown>;

    try {
        // Normalize skills for array-contains queries
        const rawSkills = (profile.skills || []) as (string | { name?: string })[];
        const skillsNormalized = normalizeSkills(rawSkills);

        // Calculate total experience
        const experience = (profile.experience || []) as Array<{ startDate?: string; endDate?: string }>;
        const totalExperienceYears = calculateTotalExperience(experience);

        // Normalize location
        const personalInfo = profile.personalInfo as Record<string, string> | undefined;
        const locationNormalized = normalizeLocation(
            personalInfo?.location
        );

        await adminDb.collection("resumes").doc(resumeId).update({
            skillsNormalized,
            totalExperienceYears,
            locationNormalized,
            searchUpdatedAt: new Date().toISOString(),
        });

        // Invalidate any cached search results containing this resume
        invalidateCacheForResume(resumeId);

        logger.info({ resumeId }, "Search metadata updated");
    } catch (error) {
        logger.error({ err: error, resumeId }, "Failed to add search metadata");
    }
}

/**
 * Get cache statistics for monitoring
 */
export function getSearchCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
} {
    return getSearchCache().getStats();
}

// ============================================================================
// JD-Based Search
// ============================================================================

export interface JDSearchOptions {
    /** Job description text */
    jdText: string;
    /** Recruiter ID for access status checks */
    recruiterId: string;
    /** Maximum results to return */
    limit?: number;
    /** Use AI for JD parsing (more accurate but slower) */
    useAI?: boolean;
}

export interface JDSearchResult extends SmartSearchResult {
    /** Parsed job description details */
    parsedJD: {
        title: string;
        requiredSkills: string[];
        preferredSkills: string[];
        minExperience: number | null;
        location: string | null;
        workMode: string | null;
    };
    /** Generated search query from JD */
    generatedQuery: string;
}

/**
 * Search for candidates by job description
 * Parses the JD to extract requirements and finds matching candidates
 * Uses skill-based search as primary (fast) with optional semantic enhancement
 */
export async function searchByJobDescription(
    options: JDSearchOptions
): Promise<JDSearchResult> {
    const startTime = Date.now();
    const { jdText, recruiterId, limit = DEFAULT_LIMIT, useAI = true } = options;

    // Dynamically import JD parser to avoid circular dependencies
    const { parseJobDescription } = await import("./jdParserService");

    // 1. Parse the job description
    logger.info({ jdLength: jdText.length, useAI }, "Parsing job description for search");
    const parsedJD = await parseJobDescription(jdText, { useAI });

    logger.info(
        {
            title: parsedJD.title,
            requiredSkills: parsedJD.requiredSkills,
            preferredSkills: parsedJD.preferredSkills,
        },
        "JD parsed successfully"
    );

    // 2. Extract all skills for search
    const allSkills = [...parsedJD.requiredSkills, ...parsedJD.preferredSkills];

    // 3. Perform skill-based search (fast, no embedding needed)
    // This is the primary search method - more reliable than vector search
    const skillFilters = {
        skills: [...new Set(allSkills)],
        location: parsedJD.location,
        minExperience: parsedJD.minExperience,
        maxExperience: parsedJD.maxExperience,
    };

    let searchResult: SmartSearchResult;

    try {
        // Use skill-based search for reliability
        // Vector search requires proper index setup which may not be available
        const skillSearchResult = await performSkillSearch(
            skillFilters
        );

        logger.info(
            { resultCount: skillSearchResult.results.length, scanned: skillSearchResult.scanned },
            "Skill-based search completed"
        );

        searchResult = {
            results: skillSearchResult.results,
            searchType: "skill" as const,
            fromCache: false,
            searchTimeMs: Date.now() - startTime,
            totalScanned: skillSearchResult.scanned,
            parsedQuery: parsedJD.parsedQuery,
        };
    } catch (searchError) {
        logger.error({ err: searchError }, "Search failed, returning empty results");
        searchResult = {
            results: [],
            searchType: "skill" as const,
            fromCache: false,
            searchTimeMs: Date.now() - startTime,
            totalScanned: 0,
            parsedQuery: parsedJD.parsedQuery,
        };
    }

    // 4. Re-rank results based on JD requirements
    const rerankedResults = rerankByJDMatch(
        searchResult.results,
        parsedJD.requiredSkills,
        parsedJD.preferredSkills
    );

    const searchTimeMs = Date.now() - startTime;

    logger.info(
        {
            jdTitle: parsedJD.title,
            requiredSkills: parsedJD.requiredSkills.length,
            preferredSkills: parsedJD.preferredSkills.length,
            resultCount: rerankedResults.length,
            searchTimeMs,
        },
        "JD-based search completed"
    );

    return {
        ...searchResult,
        results: rerankedResults.slice(0, limit),
        searchTimeMs,
        parsedJD: {
            title: parsedJD.title,
            requiredSkills: parsedJD.requiredSkills,
            preferredSkills: parsedJD.preferredSkills,
            minExperience: parsedJD.minExperience,
            location: parsedJD.location,
            workMode: parsedJD.workMode,
        },
        generatedQuery: parsedJD.searchQuery,
    };
}

/**
 * Re-rank candidates based on how well they match JD requirements
 */
function rerankByJDMatch(
    candidates: RankedCandidate[],
    requiredSkills: string[],
    preferredSkills: string[]
): RankedCandidate[] {
    // Create normalized skill sets for matching
    const required = new Set(requiredSkills.map((s) => s.toLowerCase()));
    const preferred = new Set(preferredSkills.map((s) => s.toLowerCase()));

    return candidates
        .map((candidate) => {
            const candidateSkills = new Set(
                candidate.skills.map((s) => s.toLowerCase())
            );

            // Count required skill matches
            let requiredMatches = 0;
            const matchedRequired: string[] = [];
            for (const skill of required) {
                if (candidateSkillMatches(candidateSkills, skill)) {
                    requiredMatches++;
                    matchedRequired.push(skill);
                }
            }

            // Count preferred skill matches
            let preferredMatches = 0;
            const matchedPreferred: string[] = [];
            for (const skill of preferred) {
                if (candidateSkillMatches(candidateSkills, skill)) {
                    preferredMatches++;
                    matchedPreferred.push(skill);
                }
            }

            // Calculate new match score
            // Required skills: 70% weight, Preferred: 30% weight
            const requiredScore = required.size > 0
                ? (requiredMatches / required.size) * 70
                : 35; // If no required skills specified, give base score
            const preferredScore = preferred.size > 0
                ? (preferredMatches / preferred.size) * 30
                : 15;

            const newScore = Math.round(requiredScore + preferredScore);

            // Generate detailed match reason
            const matchReason = generateJDMatchReason(
                matchedRequired,
                required.size,
                matchedPreferred,
                preferred.size
            );

            return {
                ...candidate,
                matchScore: newScore,
                matchedSkills: [...matchedRequired, ...matchedPreferred],
                matchReason,
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Check if candidate has a skill (with fuzzy matching)
 */
function candidateSkillMatches(candidateSkills: Set<string>, skill: string): boolean {
    // Exact match
    if (candidateSkills.has(skill)) {
        return true;
    }

    // Fuzzy match (skill is contained in candidate skill or vice versa)
    for (const cs of candidateSkills) {
        if (cs.includes(skill) || skill.includes(cs)) {
            return true;
        }
    }

    return false;
}

/**
 * Generate human-readable match reason for JD-based search
 */
function generateJDMatchReason(
    matchedRequired: string[],
    totalRequired: number,
    matchedPreferred: string[],
    totalPreferred: number
): string {
    const parts: string[] = [];

    if (totalRequired > 0) {
        const pct = Math.round((matchedRequired.length / totalRequired) * 100);
        parts.push(`${matchedRequired.length}/${totalRequired} required skills (${pct}%)`);
    }

    if (totalPreferred > 0 && matchedPreferred.length > 0) {
        parts.push(`${matchedPreferred.length}/${totalPreferred} preferred skills`);
    }

    if (matchedRequired.length > 0) {
        const topSkills = matchedRequired.slice(0, 3).join(", ");
        parts.push(`Key: ${topSkills}`);
    }

    return parts.length > 0 ? parts.join(". ") : "Profile matches search criteria";
}
