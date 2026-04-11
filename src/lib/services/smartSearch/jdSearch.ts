import { logger } from "@/lib/logger";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { performHybridSearch } from "./searchEngine";
import { rerankByJDMatch } from "./scoring";
import type { JDSearchOptions, JDSearchResult } from "./types";
import { getUserRole } from "@/lib/services/userService";

/**
 * Search for candidates by job description
 * Parses the JD to extract requirements and finds matching candidates
 * Uses skill-based search as primary (fast) with optional semantic enhancement
 */
export async function searchByJobDescription(
    options: JDSearchOptions,
): Promise<JDSearchResult> {
    const startTime = Date.now();
    const { jdText, recruiterId, limit = 50, useAI = true } = options;

    const requesterRole = await getUserRole(recruiterId);
    if (requesterRole !== "recruiter" && requesterRole !== "admin") {
        throw new Error("forbidden-role");
    }

    logger.info(
        { recruiterId, jdLength: jdText.length, useAI, limit },
        "Starting JD-based search",
    );

    let parsedJD: JDSearchResult["parsedJD"];
    let generatedQuery: string;

    if (useAI) {
        try {
            // 1. Call AI service to parse JD
            const parseJDFn = httpsCallable(functions, "parseJobDescription");
            const result = await parseJDFn({ jdText });
            const data = result.data as Record<string, unknown>;

            parsedJD = {
                title: (data.title as string) || "",
                requiredSkills: (data.requiredSkills as string[]) || [],
                preferredSkills: (data.preferredSkills as string[]) || [],
                minExperience: (data.minExperience as number) || null,
                location: (data.location as string) || null,
                workMode: (data.workMode as string) || null,
            };

            generatedQuery = `${parsedJD.title} ${parsedJD.requiredSkills.join(" ")}`;
        } catch (error) {
            logger.error({ err: error }, "AI JD parsing failed, falling back");
            // Fallback: Simple extraction (mock for now or basic regex)
            parsedJD = {
                title: "Software Engineer",
                requiredSkills: [],
                preferredSkills: [],
                minExperience: null,
                location: null,
                workMode: null,
            };
            generatedQuery = jdText.slice(0, 100);
        }
    } else {
        // Basic heuristics for non-AI mode
        parsedJD = {
            title: "Extracted Title",
            requiredSkills: [],
            preferredSkills: [],
            minExperience: null,
            location: null,
            workMode: null,
        };
        generatedQuery = jdText.slice(0, 100);
    }

    // 2. Perform search using the extracted requirements
    // We use hybrid search with the generated query and explicit filters
    const filters = {
        skills: parsedJD.requiredSkills,
        location: parsedJD.location,
        minExperience: parsedJD.minExperience,
        maxExperience: null,
    };

    const { results, scanned } = await performHybridSearch(
        {
            rawQuery: generatedQuery,
            skills: parsedJD.requiredSkills,
            location: parsedJD.location,
            minExperience: parsedJD.minExperience,
            maxExperience: null,
            semanticQuery: generatedQuery,
            queryType: "hybrid",
            confidence: 0.9,
        },
        filters,
    );

    // Reconstruct parsedQuery locally for the return type since searchEngine doesn't return it
    const parsedQuery = {
        rawQuery: generatedQuery,
        skills: parsedJD.requiredSkills,
        location: parsedJD.location,
        minExperience: parsedJD.minExperience,
        maxExperience: null,
        semanticQuery: generatedQuery,
        queryType: "hybrid" as const,
        confidence: 0.9,
    };

    // 3. Re-rank results specifically for the JD
    const reranked = rerankByJDMatch(
        results,
        parsedJD.requiredSkills,
        parsedJD.preferredSkills,
    );

    return {
        results: reranked.slice(0, limit),
        searchType: "hybrid",
        fromCache: false,
        searchTimeMs: Date.now() - startTime,
        totalScanned: scanned,
        parsedJD,
        generatedQuery,
        parsedQuery,
    };
}
