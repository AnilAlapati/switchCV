import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/services/aiGenerationService";
import {
    parseSearchQuery,
    type ParsedQuery,
} from "../queryParser";
import {
    getSearchCache,
    generateQueryHash,
} from "../searchCache";
import {
    calculateMatchScore,
    generateMatchReason,
    generateSemanticMatchReason,
    candidateSkillMatches,
} from "./scoring";
import { getDisplayName } from "./metadata";
import type {
    SmartSearchOptions,
    SmartSearchResult,
    RankedCandidate,
} from "./types";

// Constants
const DEFAULT_LIMIT = 50;
const SKILL_SEARCH_LIMIT = 100; // Scan more for skill search, then rank
const VECTOR_SEARCH_LIMIT = 50;

/**
 * Perform a smart search with automatic strategy selection
 */
export async function performSmartSearch(
    options: SmartSearchOptions,
): Promise<SmartSearchResult> {
    const startTime = Date.now();
    const { query, limit = DEFAULT_LIMIT, filters } = options;

    // 1. Parse the query
    const parsedQuery = parseSearchQuery(query);

    // Merge explicit filters with parsed ones
    const mergedFilters = {
        skills: [...parsedQuery.skills, ...(filters?.skills || [])],
        location: filters?.location || parsedQuery.location,
        minExperience: filters?.minExperience ?? parsedQuery.minExperience,
        maxExperience: filters?.maxExperience ?? parsedQuery.maxExperience,
    };

    // 2. Check cache
    const cacheKey = generateQueryHash(query, mergedFilters);
    const cache = getSearchCache();
    const cached = cache.get(cacheKey) as RankedCandidate[] | undefined;

    if (cached !== undefined) {
        logger.info(
            { cacheKey, resultCount: cached.length },
            "Smart search cache hit",
        );
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
                mergedFilters,
            );
            results = semanticResult.results;
            totalScanned = semanticResult.scanned;
            break;

        case "hybrid":
        default:
            const hybridResult = await performHybridSearch(parsedQuery, mergedFilters);
            results = hybridResult.results;
            totalScanned = hybridResult.scanned;
            break;
    }

    // 4. Update cache
    cache.set(cacheKey, results);

    return {
        results: results.slice(0, limit),
        searchType: parsedQuery.queryType,
        fromCache: false,
        searchTimeMs: Date.now() - startTime,
        totalScanned,
        parsedQuery,
    };
}

/**
 * Skill-based search using Firestore indexes
 */
export async function performSkillSearch(filters: {
    skills: string[];
    location: string | null;
    minExperience: number | null;
    maxExperience: number | null;
}): Promise<{ results: RankedCandidate[]; scanned: number }> {
    const { skills, location, minExperience, maxExperience } = filters;

    if (skills.length === 0) {
        return { results: [], scanned: 0 };
    }

    const querySkills = skills.slice(0, 10);

    let dbQuery: FirebaseFirestore.Query = adminDb
        .collection("resumes")
        .where("searchMetadata.skills", "array-contains-any", querySkills);

    // Apply location filter if specified (exact match on normalized location)
    if (location) {
        dbQuery = dbQuery.where("searchMetadata.location", "==", location);
    }

    // Apply experience range if specified
    if (minExperience !== null) {
        dbQuery = dbQuery.where("searchMetadata.experienceYears", ">=", minExperience);
    }
    if (maxExperience !== null) {
        dbQuery = dbQuery.where("searchMetadata.experienceYears", "<=", maxExperience);
    }

    const snapshot = await dbQuery.limit(SKILL_SEARCH_LIMIT).get();
    const results: RankedCandidate[] = [];

    snapshot.forEach((doc) => {
        const data = doc.data();
        const metadata = (data.searchMetadata as Record<string, unknown>) || {};
        const profile = data.profile || {};

        const candidateSkills = new Set<string>(
            ((metadata.skills as string[]) || []).map((s) => s.toLowerCase()),
        );

        const matchedSkills = skills.filter((skill) =>
            candidateSkillMatches(candidateSkills, skill),
        );

        results.push({
            resumeId: doc.id,
            userId: data.userId as string,
            title: (metadata.title as string) || (profile.title as string) || "Resume",
            userName: getDisplayName(profile),
            matchScore: Math.round((matchedSkills.length / skills.length) * 100),
            matchedSkills,
            matchReason: generateMatchReason(matchedSkills, skills),
            skills: (metadata.skills as string[]) || [],
            location: metadata.location as string | undefined,
            experienceYears: metadata.experienceYears as number | undefined,
            createdAt: (data.publishedAt as string) || (data.updatedAt as string),
        });
    });

    return {
        results: results.sort((a, b) => b.matchScore - a.matchScore),
        scanned: snapshot.size,
    };
}

/**
 * Semantic vector search using embeddings
 */
export async function performSemanticSearch(
    query: string,
    filters: {
        skills: string[];
        location: string | null;
        minExperience: number | null;
        maxExperience: number | null;
    },
): Promise<{ results: RankedCandidate[]; scanned: number }> {
    // 1. Generate embedding for query
    await generateEmbedding(query);

    // 2. Query vector DB (in this implementation, we simulate vector search
    // using a combination of metadata filters and ranking)
    // In production, this would call Pinecone/GCP Vertex AI Search
    let dbQuery: FirebaseFirestore.Query = adminDb.collection("resumes");

    if (filters.location) {
        dbQuery = dbQuery.where("searchMetadata.location", "==", filters.location);
    }

    if (filters.minExperience !== null) {
        dbQuery = dbQuery.where(
            "searchMetadata.experienceYears",
            ">=",
            filters.minExperience,
        );
    }

    const snapshot = await dbQuery.limit(VECTOR_SEARCH_LIMIT).get();
    const results: RankedCandidate[] = [];

    snapshot.forEach((doc) => {
        const data = doc.data();
        const metadata = (data.searchMetadata as Record<string, unknown>) || {};
        const profile = data.profile || {};

        // Simulate vector similarity score
        const semanticScore = 0.7 + Math.random() * 0.25;

        results.push({
            resumeId: doc.id,
            userId: data.userId as string,
            title: (metadata.title as string) || (profile.title as string) || "Resume",
            userName: getDisplayName(profile),
            matchScore: Math.round(semanticScore * 100),
            matchedSkills: [],
            matchReason: generateSemanticMatchReason(semanticScore, []),
            skills: (metadata.skills as string[]) || [],
            location: metadata.location as string | undefined,
            experienceYears: metadata.experienceYears as number | undefined,
            createdAt: (data.publishedAt as string) || (data.updatedAt as string),
        });
    });

    return {
        results: results.sort((a, b) => b.matchScore - a.matchScore),
        scanned: snapshot.size,
    };
}

/**
 * Hybrid search combining skill index and vector search
 */
export async function performHybridSearch(
    parsedQuery: ParsedQuery,
    filters: {
        skills: string[];
        location: string | null;
        minExperience: number | null;
        maxExperience: number | null;
    },
): Promise<{ results: RankedCandidate[]; scanned: number }> {
    // 1. Get skill-based candidates (fast)
    const { results: skillCandidates, scanned } =
        await performSkillSearch(filters);

    // 2. Perform semantic re-ranking or additional search if needed
    // For small result sets, we just re-rank the skill matches
    const hybridResults = skillCandidates.map((candidate) => {
        const semanticScore = 0.65 + Math.random() * 0.3; // Simulated
        const finalScore = calculateMatchScore(
            candidate.matchedSkills.length,
            filters.skills.length,
            semanticScore,
        );

        return {
            ...candidate,
            matchScore: finalScore,
            matchReason: generateSemanticMatchReason(
                semanticScore,
                candidate.matchedSkills,
            ),
        };
    });

    return {
        results: hybridResults.sort((a, b) => b.matchScore - a.matchScore),
        scanned,
    };
}
