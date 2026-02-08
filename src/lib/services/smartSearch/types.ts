import type { ParsedQuery } from "../queryParser";

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

export interface JDSearchOptions {
    /** Full text of the job description */
    jdText: string;
    /** Recruiter ID for tracking and limits */
    recruiterId: string;
    /** Maximum results to return */
    limit?: number;
    /** Whether to use AI for parsing and semantic search */
    useAI?: boolean;
}

export interface JDSearchResult extends SmartSearchResult {
    /** Requirements extracted from the JD */
    parsedJD: {
        title: string;
        requiredSkills: string[];
        preferredSkills: string[];
        minExperience: number | null;
        location: string | null;
        workMode: string | null;
    };
    /** The specific query generated from JD requirements */
    generatedQuery: string;
}
