/**
 * Query Parser Service
 * Parses natural language search queries into structured filters
 * Routes queries to the appropriate search strategy
 */

import { logger } from "@/lib/logger";

export interface ParsedQuery {
    /** Original raw query string */
    rawQuery: string;
    /** Extracted skill keywords */
    skills: string[];
    /** Extracted location (city, state, country) */
    location: string | null;
    /** Minimum years of experience */
    minExperience: number | null;
    /** Maximum years of experience */
    maxExperience: number | null;
    /** Semantic query for vector search (cleaned version) */
    semanticQuery: string;
    /** Determined query type for routing */
    queryType: "skill" | "semantic" | "hybrid";
    /** Confidence score for the parsing (0-1) */
    confidence: number;
}

// Common skill keywords for detection
const SKILL_KEYWORDS = new Set([
    // Programming languages
    "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "golang",
    "rust", "swift", "kotlin", "php", "scala", "r", "matlab", "perl", "dart",
    // Frameworks & Libraries
    "react", "angular", "vue", "nextjs", "next.js", "node", "nodejs", "express",
    "django", "flask", "spring", "springboot", "rails", "laravel", "dotnet", ".net",
    "tensorflow", "pytorch", "keras", "pandas", "numpy", "scikit-learn",
    // Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
    "dynamodb", "cassandra", "firebase", "firestore", "oracle", "sqlite",
    // Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "jenkins",
    "gitlab", "github", "ci/cd", "devops", "linux", "unix", "bash",
    // Data & AI
    "machine-learning", "ml", "ai", "deep-learning", "nlp", "data-science",
    "data-engineering", "etl", "hadoop", "spark", "kafka", "airflow",
    // Other tech
    "api", "rest", "graphql", "microservices", "distributed-systems", "blockchain",
    "solidity", "web3", "mobile", "ios", "android", "flutter", "react-native",
]);

// Experience patterns
const EXPERIENCE_PATTERNS = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)?/gi,
    /(?:at\s*least|minimum|min)\s*(\d+)\s*(?:years?|yrs?)/gi,
    /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/gi,
];

// Location patterns
const LOCATION_PATTERNS = [
    /(?:in|from|based\s*in|located\s*in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:CA|NY|TX|FL|WA|IL|PA|OH|GA|NC|MI|NJ|VA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|IA|UT|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY|DC)/g,
    /\b(remote|hybrid|onsite|on-site)\b/gi,
];



/**
 * Parse a natural language search query into structured components
 */
export function parseSearchQuery(query: string): ParsedQuery {
    const rawQuery = query.trim();
    const lowerQuery = rawQuery.toLowerCase();

    // Extract skills
    const skills = extractSkills(lowerQuery);

    // Extract experience requirements
    const { min: minExperience, max: maxExperience } = extractExperience(rawQuery);

    // Extract location
    const location = extractLocation(rawQuery);

    // Generate semantic query (remove extracted entities for cleaner embedding)
    const semanticQuery = generateSemanticQuery(rawQuery, skills, location);

    // Determine query type
    const queryType = determineQueryType(skills, semanticQuery, location);

    // Calculate confidence
    const confidence = calculateConfidence(skills, location, minExperience, semanticQuery);

    const parsed: ParsedQuery = {
        rawQuery,
        skills,
        location,
        minExperience,
        maxExperience,
        semanticQuery,
        queryType,
        confidence,
    };

    logger.debug({ parsed }, "Query parsed");

    return parsed;
}

/**
 * Extract skill keywords from query
 */
function extractSkills(query: string): string[] {
    const words = query
        .replace(/[^\w\s.-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const skills: string[] = [];
    const seenSkills = new Set<string>();

    for (const word of words) {
        const normalized = word.toLowerCase().replace(/\./g, "");
        if (SKILL_KEYWORDS.has(normalized) && !seenSkills.has(normalized)) {
            skills.push(normalized);
            seenSkills.add(normalized);
        }
    }

    // Also extract multi-word skills
    const multiWordSkills = [
        { pattern: /machine\s*learning/gi, skill: "machine-learning" },
        { pattern: /deep\s*learning/gi, skill: "deep-learning" },
        { pattern: /data\s*science/gi, skill: "data-science" },
        { pattern: /distributed\s*systems/gi, skill: "distributed-systems" },
        { pattern: /react\s*native/gi, skill: "react-native" },
        { pattern: /spring\s*boot/gi, skill: "springboot" },
        { pattern: /next\.?js/gi, skill: "nextjs" },
        { pattern: /node\.?js/gi, skill: "nodejs" },
    ];

    for (const { pattern, skill } of multiWordSkills) {
        if (pattern.test(query) && !seenSkills.has(skill)) {
            skills.push(skill);
            seenSkills.add(skill);
        }
    }

    return skills;
}

/**
 * Extract experience requirements from query
 */
function extractExperience(query: string): { min: number | null; max: number | null } {
    let min: number | null = null;
    let max: number | null = null;

    for (const pattern of EXPERIENCE_PATTERNS) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
            if (match[2] !== undefined) {
                // Range pattern (e.g., "3-5 years")
                min = parseInt(match[1], 10);
                max = parseInt(match[2], 10);
            } else if (match[1] !== undefined) {
                // Single number (e.g., "5+ years")
                const years = parseInt(match[1], 10);
                if (min === null || years > min) {
                    min = years;
                }
            }
        }
        pattern.lastIndex = 0; // Reset regex
    }

    return { min, max };
}

/**
 * Extract location from query
 */
function extractLocation(query: string): string | null {
    for (const pattern of LOCATION_PATTERNS) {
        const match = pattern.exec(query);
        if (match !== null && match[1] !== undefined) {
            pattern.lastIndex = 0;
            return match[1].trim();
        }
        pattern.lastIndex = 0;
    }
    return null;
}

/**
 * Generate a cleaned semantic query for vector search
 */
function generateSemanticQuery(
    query: string,
    _skills: string[],
    _location: string | null
): string {
    let semantic = query;

    // Remove experience patterns
    for (const pattern of EXPERIENCE_PATTERNS) {
        semantic = semantic.replace(pattern, " ");
    }

    // Remove location patterns
    for (const pattern of LOCATION_PATTERNS) {
        semantic = semantic.replace(pattern, " ");
    }

    // Clean up whitespace
    semantic = semantic.replace(/\s+/g, " ").trim();

    return semantic;
}

/**
 * Determine the optimal search strategy
 */
function determineQueryType(
    skills: string[],
    semanticQuery: string,
    _location: string | null
): "skill" | "semantic" | "hybrid" {
    const hasSkills = skills.length > 0;
    const hasSemanticContent = semanticQuery.split(/\s+/).length > 3;

    if (hasSkills && !hasSemanticContent) {
        // Pure skill-based query (e.g., "Java Python AWS")
        return "skill";
    }

    if (!hasSkills && hasSemanticContent) {
        // Pure semantic query (e.g., "someone who can build scalable systems")
        return "semantic";
    }

    // Mixed query - use hybrid
    return "hybrid";
}

/**
 * Calculate parsing confidence score
 */
function calculateConfidence(
    skills: string[],
    location: string | null,
    minExperience: number | null,
    semanticQuery: string
): number {
    let confidence = 0.5; // Base confidence

    // More extracted entities = higher confidence
    if (skills.length > 0) confidence += 0.15;
    if (skills.length > 2) confidence += 0.1;
    if (location !== null) confidence += 0.1;
    if (minExperience !== null) confidence += 0.1;

    // Very short queries have lower confidence
    if (semanticQuery.length < 10) confidence -= 0.2;

    return Math.min(1, Math.max(0, confidence));
}

/**
 * Normalize a skill name for consistent matching
 */
export function normalizeSkill(skill: string): string {
    return skill
        .toLowerCase()
        .trim()
        .replace(/\./g, "")
        .replace(/\s+/g, "-");
}

/**
 * Normalize an array of skills
 */
export function normalizeSkills(skills: (string | { name?: string })[]): string[] {
    return skills
        .map((skill) => {
            const name = typeof skill === "string" ? skill : skill?.name;
            return name ? normalizeSkill(name) : null;
        })
        .filter((s): s is string => s !== null && s.length > 0);
}

/**
 * Calculate years of total experience from experience entries
 */
export function calculateTotalExperience(
    experiences: Array<{ startDate?: string; endDate?: string }> | undefined
): number {
    if (experiences === undefined || experiences.length === 0) {
        return 0;
    }

    let totalMonths = 0;

    for (const exp of experiences) {
        if (exp.startDate === undefined) continue;

        const start = new Date(exp.startDate);
        const end = exp.endDate !== undefined ? new Date(exp.endDate) : new Date();

        if (isNaN(start.getTime())) continue;

        const months = (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());

        totalMonths += Math.max(0, months);
    }

    return Math.round(totalMonths / 12);
}

/**
 * Normalize a location string for consistent matching
 */
export function normalizeLocation(location: string | undefined | null): string | null {
    if (location === undefined || location === null || location.trim() === "") {
        return null;
    }

    return location
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}
