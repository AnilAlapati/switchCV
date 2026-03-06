/**
 * Job Description Parser Service
 * Parses job descriptions (text or file) and extracts structured requirements
 * for use with the Smart Search system
 */

import { generateText } from "./aiGenerationService";
import { logger } from "@/lib/logger";
import { parseSearchQuery, type ParsedQuery } from "./queryParser";

export interface ParsedJobDescription {
    /** Original JD text */
    rawText: string;
    /** Extracted job title */
    title: string;
    /** Brief summary of the role */
    summary: string;
    /** Required skills (must-have) */
    requiredSkills: string[];
    /** Preferred/nice-to-have skills */
    preferredSkills: string[];
    /** Minimum years of experience */
    minExperience: number | null;
    /** Maximum years of experience */
    maxExperience: number | null;
    /** Location requirements */
    location: string | null;
    /** Remote/hybrid/onsite preference */
    workMode: "remote" | "hybrid" | "onsite" | null;
    /** Education requirements */
    educationLevel: string | null;
    /** Key responsibilities extracted */
    responsibilities: string[];
    /** Searchable query generated from JD */
    searchQuery: string;
    /** All extracted keywords for tagging */
    keywords: string[];
    /** Parsed query ready for smart search */
    parsedQuery: ParsedQuery;
    /** Confidence score for the parsing (0-1) */
    confidence: number;
}

export interface JDParseOptions {
    /** Use AI for enhanced extraction (slower but more accurate) */
    useAI?: boolean;
    /** Maximum tokens for AI response */
    maxTokens?: number;
}

const DEFAULT_OPTIONS: JDParseOptions = {
    useAI: true,
    maxTokens: 1500,
};

/**
 * Parse a job description and extract structured requirements
 */
export async function parseJobDescription(
    jdText: string,
    options: JDParseOptions = {}
): Promise<ParsedJobDescription> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cleanedText = cleanJDText(jdText);

    if (opts.useAI) {
        return parseWithAI(cleanedText, opts);
    }

    return parseWithRules(cleanedText);
}

/**
 * Parse JD using AI for more accurate extraction
 */
async function parseWithAI(
    jdText: string,
    opts: JDParseOptions
): Promise<ParsedJobDescription> {
    const prompt = `
You are an expert HR analyst. Parse this job description and extract structured information.

JOB DESCRIPTION:
${jdText.substring(0, 6000)}

INSTRUCTIONS:
Return a JSON object (no markdown, just pure JSON) with:
{
  "title": "<job title>",
  "summary": "<2-3 sentence summary of the role>",
  "requiredSkills": ["<must-have technical skills>"],
  "preferredSkills": ["<nice-to-have skills>"],
  "minExperience": <number or null>,
  "maxExperience": <number or null>,
  "location": "<location or null>",
  "workMode": "<remote|hybrid|onsite or null>",
  "educationLevel": "<degree requirement or null>",
  "responsibilities": ["<key responsibilities>"],
  "keywords": ["<all searchable keywords including skills, tools, methodologies>"]
}

IMPORTANT:
- Extract ONLY what's explicitly stated or strongly implied
- For skills, normalize to lowercase and use common terms (e.g., "javascript" not "JS")
- Return null for fields that aren't specified
- Keywords should include technologies, methodologies, soft skills, and industry terms
`;

    try {
        const result = await generateText(prompt, opts.maxTokens || 1500, 0.3, "gemini-1.5-flash");
        const parsed = JSON.parse(result.text.trim());

        // Generate search query from extracted data
        const searchQuery = generateSearchQuery(parsed);
        const parsedQuery = parseSearchQuery(searchQuery);

        return {
            rawText: jdText,
            title: parsed.title || "Unknown Position",
            summary: parsed.summary || "",
            requiredSkills: normalizeSkillArray(parsed.requiredSkills),
            preferredSkills: normalizeSkillArray(parsed.preferredSkills),
            minExperience: parsed.minExperience,
            maxExperience: parsed.maxExperience,
            location: parsed.location,
            workMode: parsed.workMode,
            educationLevel: parsed.educationLevel,
            responsibilities: parsed.responsibilities || [],
            searchQuery,
            keywords: normalizeSkillArray(parsed.keywords),
            parsedQuery,
            confidence: 0.85, // AI parsing generally has high confidence
        };
    } catch (error) {
        logger.warn({ err: error }, "AI JD parsing failed, falling back to rules");
        return parseWithRules(jdText);
    }
}

/**
 * Parse JD using rule-based extraction (faster, no AI cost)
 */
function parseWithRules(jdText: string): ParsedJobDescription {
    const lowerText = jdText.toLowerCase();

    // Extract title from first line or patterns
    const title = extractTitle(jdText);

    // Extract skills using keyword matching
    const { required, preferred } = extractSkills(lowerText);

    // Extract experience
    const { min: minExperience, max: maxExperience } = extractExperience(jdText);

    // Extract location
    const location = extractLocationFromJD(jdText);

    // Extract work mode
    const workMode = extractWorkMode(lowerText);

    // Extract responsibilities (bullet points after "responsibilities" header)
    const responsibilities = extractResponsibilities(jdText);

    // Generate keywords
    const keywords = [...new Set([...required, ...preferred])];

    // Generate search query
    const searchQuery = generateSearchQuery({
        title,
        requiredSkills: required,
        preferredSkills: preferred,
        minExperience,
        location,
    });

    const parsedQuery = parseSearchQuery(searchQuery);

    return {
        rawText: jdText,
        title,
        summary: "",
        requiredSkills: required,
        preferredSkills: preferred,
        minExperience,
        maxExperience,
        location,
        workMode,
        educationLevel: null,
        responsibilities,
        searchQuery,
        keywords,
        parsedQuery,
        confidence: 0.6, // Rule-based has lower confidence
    };
}

/**
 * Clean and normalize JD text
 */
function cleanJDText(text: string): string {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .trim();
}

/**
 * Extract job title from JD
 */
function extractTitle(jdText: string): string {
    const lines = jdText.split("\n").filter((l) => l.trim().length > 0);

    // First non-empty line is often the title
    if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length < 100 && !firstLine.includes(".")) {
            return firstLine;
        }
    }

    // Look for "Job Title:" or "Position:" patterns
    const titlePattern = /(?:job\s*title|position|role)\s*[:：]\s*([^\n]+)/i;
    const match = jdText.match(titlePattern);
    if (match !== null) {
        return match[1].trim();
    }

    return "Unknown Position";
}

/**
 * Extract skills from JD text
 */
function extractSkills(lowerText: string): { required: string[]; preferred: string[] } {
    const allSkills = new Set<string>();
    const requiredSkills = new Set<string>();
    const preferredSkills = new Set<string>();

    // Common tech skills to look for
    const techKeywords = [
        "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "golang",
        "rust", "swift", "kotlin", "php", "scala", "react", "angular", "vue", "nextjs",
        "node", "nodejs", "express", "django", "flask", "spring", "rails", "laravel",
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
        "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
        "machine learning", "ml", "ai", "deep learning", "nlp", "data science",
        "microservices", "distributed systems", "api", "rest", "graphql",
        "agile", "scrum", "devops", "ci/cd", "git", "linux",
    ];

    // Check for required section
    const requiredSection = extractSection(lowerText, [
        "required", "requirements", "must have", "qualifications",
    ]);

    // Check for preferred section
    const preferredSection = extractSection(lowerText, [
        "preferred", "nice to have", "bonus", "desired", "plus",
    ]);

    for (const skill of techKeywords) {
        if (requiredSection.includes(skill)) {
            requiredSkills.add(skill);
            allSkills.add(skill);
        } else if (preferredSection.includes(skill)) {
            preferredSkills.add(skill);
            allSkills.add(skill);
        } else if (lowerText.includes(skill)) {
            allSkills.add(skill);
        }
    }

    // If no required skills found, treat all as required
    if (requiredSkills.size === 0) {
        return {
            required: Array.from(allSkills),
            preferred: [],
        };
    }

    return {
        required: Array.from(requiredSkills),
        preferred: Array.from(preferredSkills),
    };
}

/**
 * Extract a section from text by header keywords
 */
function extractSection(text: string, headers: string[]): string {
    for (const header of headers) {
        const pattern = new RegExp(`${header}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, "i");
        const match = text.match(pattern);
        if (match !== null) {
            return match[1].toLowerCase();
        }
    }
    return "";
}

/**
 * Extract experience requirements
 */
function extractExperience(jdText: string): { min: number | null; max: number | null } {
    const patterns = [
        /(\d+)\s*\+\s*years?/i,
        /(\d+)\s*-\s*(\d+)\s*years?/i,
        /minimum\s*(?:of\s*)?(\d+)\s*years?/i,
        /at\s*least\s*(\d+)\s*years?/i,
        /(\d+)\s*years?\s*(?:of\s*)?experience/i,
    ];

    for (const pattern of patterns) {
        const match = jdText.match(pattern);
        if (match !== null) {
            if (match[2] !== undefined) {
                return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
            }
            return { min: parseInt(match[1], 10), max: null };
        }
    }

    return { min: null, max: null };
}

/**
 * Extract location from JD
 */
function extractLocationFromJD(jdText: string): string | null {
    const patterns = [
        /location\s*[:：]\s*([^\n]+)/i,
        /based\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/,
        /office\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    ];

    for (const pattern of patterns) {
        const match = jdText.match(pattern);
        if (match !== null) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Extract work mode (remote/hybrid/onsite)
 */
function extractWorkMode(lowerText: string): "remote" | "hybrid" | "onsite" | null {
    if (lowerText.includes("fully remote") || lowerText.includes("100% remote")) {
        return "remote";
    }
    if (lowerText.includes("hybrid")) {
        return "hybrid";
    }
    if (lowerText.includes("on-site") || lowerText.includes("onsite") || lowerText.includes("in-office")) {
        return "onsite";
    }
    if (lowerText.includes("remote")) {
        return "remote";
    }
    return null;
}

/**
 * Extract responsibilities from JD
 */
function extractResponsibilities(jdText: string): string[] {
    const section = extractSection(jdText.toLowerCase(), ["responsibilities", "what you'll do", "duties"]);

    if (section === "") {
        return [];
    }

    // Split by bullet points or newlines
    const bullets = section
        .split(/[•\-\*\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 200);

    return bullets.slice(0, 10);
}

/**
 * Normalize skill array
 */
function normalizeSkillArray(skills: unknown): string[] {
    if (!Array.isArray(skills)) {
        return [];
    }
    return skills
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.toLowerCase().trim())
        .filter((s) => s.length > 0);
}

/**
 * Generate a search query from parsed JD data
 */
function generateSearchQuery(parsed: {
    title?: string;
    requiredSkills?: string[];
    preferredSkills?: string[];
    minExperience?: number | null;
    location?: string | null;
}): string {
    const parts: string[] = [];

    if (parsed.title !== undefined) {
        parts.push(parsed.title);
    }

    if (parsed.requiredSkills !== undefined && parsed.requiredSkills.length > 0) {
        parts.push(parsed.requiredSkills.slice(0, 5).join(" "));
    }

    if (parsed.minExperience !== undefined && parsed.minExperience !== null) {
        parts.push(`${parsed.minExperience}+ years experience`);
    }

    if (parsed.location !== undefined && parsed.location !== null) {
        parts.push(`in ${parsed.location}`);
    }

    return parts.join(" ");
}

/**
 * Parse a JD file (PDF, DOCX, or TXT).
 * TXT is parsed locally; PDF and DOCX are delegated to the authenticated
 * server-side parsing route used by the recruiter upload flow.
 */
export async function parseJDFile(
    file: File | Blob,
    fileName: string
): Promise<ParsedJobDescription> {
    const extension = fileName.split(".").pop()?.toLowerCase();

    let text: string;

    switch (extension) {
        case "txt":
            text = await file.text();
            break;
        case "pdf":
        case "docx":
            {
                const formData = new FormData();
                formData.append("file", file, fileName);

                const response = await fetch("/api/utils/parse-jd", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json().catch(() => null) as { error?: string; text?: string } | null;

                if (!response.ok || !data?.text) {
                    throw new Error(data?.error || "Failed to parse document file.");
                }

                text = data.text;
            }
            break;
        case "doc":
            throw new Error("Legacy .doc files are not supported. Please upload a .docx, .pdf, or .txt file.");
        default:
            throw new Error(`Unsupported file type: ${extension}`);
    }

    return parseJobDescription(text);
}
