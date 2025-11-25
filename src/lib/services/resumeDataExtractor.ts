/* eslint-disable max-lines */
/**
 * Resume Data Extractor Service
 *
 * Extracts structured resume data from conversational AI responses
 * using pattern matching, NLP techniques, and structured data markers.
 *
 * @module services/resumeDataExtractor
 */

import {
  ResumeDataRequirements,
  ExperienceEntry,
  EducationEntry,
} from "./conversationManager";

export interface ExtractionResult {
  /** Successfully extracted data */
  data: Partial<ResumeDataRequirements>;
  /** Confidence score (0-1) for the extraction */
  confidence: number;
  /** Fields that were extracted */
  extractedFields: string[];
  /** Whether AI indicated completion */
  isComplete: boolean;
}

/**
 * Extracted JSON data structure from AI responses
 */
interface ExtractedJSONData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[];
  isComplete?: boolean;
}

/**
 * Resume Data Extractor
 *
 * Parses conversation text and AI responses to extract structured resume data.
 * Uses multiple strategies: JSON markers, pattern matching, and NLP.
 */
export class ResumeDataExtractor {
  /**
   * Extract resume data from AI response text
   */
  static extract(
    responseText: string,
    conversationHistory?: string
  ): ExtractionResult {
    const data: Partial<ResumeDataRequirements> = {};
    const extractedFields: string[] = [];
    let confidence = 0.5; // Base confidence
    let isComplete = false;

    // Strategy 1: Check for structured JSON markers
    const jsonData = this.extractJSONData(responseText);
    if (jsonData) {
      Object.assign(data, jsonData);
      confidence = 0.95;
      isComplete = jsonData.isComplete || false;
      extractedFields.push(...Object.keys(jsonData));
    }

    // Strategy 2: Pattern matching for common fields
    const patternData = this.extractViaPatterns(
      responseText,
      conversationHistory
    );
    Object.assign(data, patternData);
    extractedFields.push(...Object.keys(patternData));

    // Strategy 3: Check for completion indicators
    if (this.hasCompletionMarker(responseText)) {
      isComplete = true;
      confidence = Math.max(confidence, 0.8);
    }

    return {
      data,
      confidence,
      extractedFields: [...new Set(extractedFields)],
      isComplete,
    };
  }

  /**
   * Extract data from JSON markers in AI response
   * Looks for patterns like: ```json {...} ``` or RESUME_DATA: {...}
   */
  private static extractJSONData(text: string): ExtractedJSONData | null {
    try {
      // Look for JSON code blocks
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = text.match(jsonBlockRegex);

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim()) as ExtractedJSONData;
      }

      // Look for RESUME_DATA marker
      const dataMarkerRegex = /RESUME_DATA:\s*({[\s\S]*?})/;
      const dataMatch = text.match(dataMarkerRegex);

      if (dataMatch && dataMatch[1]) {
        return JSON.parse(dataMatch[1].trim()) as ExtractedJSONData;
      }

      // Look for any JSON object
      const jsonObjectRegex = /{[\s\S]*?}/;
      const objectMatch = text.match(jsonObjectRegex);

      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]) as ExtractedJSONData;
        // Validate it looks like resume data
        if (parsed.name || parsed.email || parsed.experience) {
          return parsed;
        }
      }
    } catch {
      // JSON parsing failed - not a problem, will use pattern matching
    }

    return null;
  }

  /**
   * Detect context from AI message
   */
  private static detectContext(
    text: string
  ): "education" | "experience" | "skills" | "contact" | null {
    const lower = text.toLowerCase();
    if (
      lower.includes("education") ||
      lower.includes("degree") ||
      lower.includes("university") ||
      lower.includes("school") ||
      lower.includes("college") ||
      lower.includes("major") ||
      lower.includes("graduate")
    )
      return "education";
    if (
      lower.includes("experience") ||
      lower.includes("work") ||
      lower.includes("job") ||
      lower.includes("company") ||
      lower.includes("role") ||
      lower.includes("position")
    )
      return "experience";
    if (
      lower.includes("skill") ||
      lower.includes("technology") ||
      lower.includes("technologies") ||
      lower.includes("proficient")
    )
      return "skills";
    if (
      lower.includes("email") ||
      lower.includes("phone") ||
      lower.includes("contact") ||
      lower.includes("name")
    )
      return "contact";
    return null;
  }

  /**
   * Extract data using regex patterns
   */
  private static extractViaPatterns(
    text: string,
    history?: string,
    context?: "education" | "experience" | "skills" | "contact" | null
  ): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const trimmedText = text.trim();
    const fullText = history ? `${history}\n${trimmedText}` : trimmedText;

    // Extract name
    const namePatterns = [
      /(?:[Mm]y name is|[Ii]'m|[Ii] am|[Cc]all me)\s+([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.?)){0,3})(?=\s|$|[.,])/,
      /[Nn]ame:\s*([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.?)){0,3})(?=\s|$|[.,])/,
      // Fallback for just the name if it looks like a name (2-3 capitalized words or initials)
      /^([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.?)){1,3})$/,
    ];

    for (const pattern of namePatterns) {
      const match = trimmedText.match(pattern) || fullText.match(pattern);
      if (match && match[1]) {
        data.name = match[1].trim();
        break;
      }
    }

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = fullText.match(emailRegex);
    if (emailMatch) {
      data.email = emailMatch[0];
    }

    // Extract phone
    const phoneRegex =
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/;
    const phoneMatch = fullText.match(phoneRegex);
    if (phoneMatch) {
      data.phone = phoneMatch[0];
    }

    // Extract location (city, state)
    const locationPatterns = [
      /(?:located in|based in|live in)\s+([a-z]+(?: [a-z]+)?(?:,?\s+[a-z]{2})?)/i,
      /location:\s*([a-z]+(?: [a-z]+)?(?:,?\s+[a-z]{2})?)/i,
      // "from" requires strict City, State format to avoid "from University"
      /from\s+([a-z]+(?: [a-z]+)?,\s*[a-z]{2})/i,
      // City, State format (e.g. New York, NY) - relaxed case
      /([a-z]+(?: [a-z]+)?,\s*([a-z]{2}))/i,
    ];

    const US_STATE_CODES = new Set([
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
      "DC",
    ]);

    for (const pattern of locationPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        // For the last pattern (generic City, State), validate the state code
        if (pattern.source.includes("([a-z]{2}))")) {
          const stateCode = match[2].toUpperCase();
          if (US_STATE_CODES.has(stateCode)) {
            data.location = match[1].trim();
            break;
          }
        } else if (match[1]) {
          data.location = match[1].trim();
          break;
        }
      }
    }

    // Extract skills (comma or bullet separated lists)
    const skillsPatterns = [
      /skills?:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
      /proficient in:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
      /technologies?:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
      /(?:I know|I use|experience with)\s+([^.\n]+(?:,\s*[^.\n]+)*)/i,
    ];

    // 1. Try explicit patterns first
    for (const pattern of skillsPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const skillsList = match[1]
          .split(/,|;|\n|\s+and\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 50);

        if (skillsList.length > 0) {
          data.skills = skillsList;
          break;
        }
      }
    }

    // 2. Fallback: Look for lines containing tech keywords
    if (!data.skills) {
      const techKeywords = [
        "Java",
        "Python",
        "React",
        "Node.js",
        "AWS",
        "Docker",
        "SQL",
        "NoSQL",
        "TypeScript",
        "Go",
        "Rust",
        "HTML",
        "CSS",
        "Git",
        "C++",
        "C#",
        "Kubernetes",
        "CI/CD",
        "Agile",
        "Scrum",
        "JavaScript",
      ];
      const lines = fullText.split("\n");
      const foundSkills: string[] = [];

      for (const line of lines) {
        // If line contains at least 2 keywords, treat it as a skills list
        const keywordsInLine = techKeywords.filter((kw) =>
          line.toLowerCase().includes(kw.toLowerCase())
        );
        if (keywordsInLine.length >= 1) {
          // Split by comma or space if no commas
          const hasComma = line.includes(",");
          const parts = hasComma ? line.split(/,|;/) : line.split(/\s+/);

          parts.forEach((p) => {
            const clean = p.trim().replace(/[^a-zA-Z0-9+#.]/g, ""); // Clean punctuation
            if (
              clean.length > 1 &&
              clean.length < 20 &&
              !["and", "with", "i", "know", "use", "the", "a"].includes(
                clean.toLowerCase()
              )
            ) {
              foundSkills.push(clean);
            }
          });
        }
      }
      if (foundSkills.length > 0) {
        data.skills = [...new Set(foundSkills)];
      }
    }

    // Extract experience (basic detection)
    const experienceKeywords = [
      "worked at",
      "work at",
      "employed at",
      "position at",
      "job at",
      "role at",
      "worked as",
      "work as",
      "current role",
      "senior software engineer", // Common job titles as keywords
      "software engineer",
      "developer",
      "engineer",
      "manager",
    ];
    const hasExperience = experienceKeywords.some((kw) =>
      fullText.toLowerCase().includes(kw)
    );

    if (hasExperience || /@/.test(fullText)) {
      // @ often used for "Title @ Company"
      // Extract company and title
      const expPatterns = [
        /(?:worked|work|employed|position|job|role)\s+(?:as|at)\s+((?:(?! at ).)+)(?:\s+at\s+([^,.\n]+))?/i,
        // "Title @ Company"
        /([A-Za-z\s]+)\s+@\s+([A-Za-z\s]+)/,
        // "I spent X years at Company"
        /(?:spent|worked)\s+(?:.*?)\s+at\s+([A-Za-z\s]+)/i,
      ];

      for (const pattern of expPatterns) {
        const expMatch = fullText.match(pattern);
        if (expMatch) {
          const experience: ExperienceEntry = {
            title: expMatch[1]?.trim() || "Professional",
            company:
              expMatch[2]?.trim() ||
              (pattern.source.includes("spent")
                ? expMatch[1].trim()
                : "Company"),
            duration: "Present",
            description: "Contributed to various projects and initiatives",
          };

          data.experience = [experience];
          break;
        }
      }
    }

    // Extract education
    const educationKeywords = [
      "degree",
      "graduated",
      "studied at",
      "university",
      "college",
      "bachelor",
      "master",
      "phd",
      "b.tech",
      "m.tech",
      "b.e",
      "m.e",
      "b.s",
      "m.s",
      "mba",
      "bba",
      "diploma",
      "btech",
      "mtech",
    ];
    const hasEducation =
      context === "education" ||
      educationKeywords.some((kw) => fullText.toLowerCase().includes(kw));

    if (hasEducation) {
      const eduPatterns = [
        // Comprehensive pattern for "Degree in Major from Institution Year" or "Degree, Institution, Year"
        /(B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?S|M\.?S|MBA|BBA|Diploma|B\.?A|M\.?A|Bachelor|Master|PhD|Doctorate)(?:\s+(?:in|of)\s+([^,]+?))?(?:[,]\s*|\s+from\s+|\s+at\s+)([^0-9,\n]+?)(?:\s+(?:in\s+)?(\d{4}))?(?:\s|$)/i,

        /(bachelor|master|phd|associate|doctorate|degree)(?:['\s]+(?:of|in))?\s+([^,.\n]+)?\s+(?:from|at)?\s*([^,.\n]+)/i,
        // "Graduated from [Institution] with [Degree]" - use non-greedy capture
        /graduated\s+from\s+(.+?)\s+(?:with|in)\s+(?:a\s+)?(.+)/i,
        // "[Degree] [Institution]" (messy)
        /(bachelor|master|phd|associate|doctorate|degree)\s+([\w\s.&'-]+)/i,
      ];

      // Context-aware fallback patterns (more permissive)
      if (context === "education") {
        eduPatterns.push(
          // "Degree/Major at Institution Year" (generic)
          /^(.+?)\s+(?:at|from|in)\s+(.+?)(?:\s+(\d{4}))?$/i,
          // "Degree/Major, Institution, Year" (generic comma separated)
          /^(.+?),\s*(.+?)(?:,\s*(\d{4}))?$/i
        );
      }

      for (const pattern of eduPatterns) {
        const eduMatch = fullText.match(pattern);
        if (eduMatch) {
          let degree = "Degree";
          let institution = "University";
          let year = new Date().getFullYear().toString();
          let major = "";

          // Handle the new comprehensive pattern (index 0)
          if (pattern.source.startsWith("(B\\.?Tech")) {
            degree = eduMatch[1].trim();
            major = eduMatch[2]?.trim() || "";
            institution = eduMatch[3]?.trim();
            if (eduMatch[4]) year = eduMatch[4];
          } else if (pattern.source.includes("graduated")) {
            institution = eduMatch[1].trim();
            degree = eduMatch[2].trim();
          } else if (
            context === "education" &&
            !pattern.source.includes("bachelor")
          ) {
            // Handle generic fallback patterns
            // Group 1: Degree/Major, Group 2: Institution, Group 3: Year
            degree = eduMatch[1].trim();
            institution = eduMatch[2].trim();
            if (eduMatch[3]) year = eduMatch[3];
          } else {
            degree = eduMatch[1]
              ? `${eduMatch[1]} ${eduMatch[2] || ""}`.trim()
              : "Degree";
            institution =
              eduMatch[3]?.trim() || eduMatch[2]?.trim() || "University";
          }

          const education: EducationEntry = {
            degree,
            institution,
            year,
            major: major || undefined,
          };
          data.education = [education];
          break;
        }
      }
    }

    return data;
  }

  /**
   * Check if text contains completion markers
   */
  private static hasCompletionMarker(text: string): boolean {
    const completionMarkers = [
      "RESUME_COMPLETE",
      "ready to create",
      "create your resume",
      "have all the information",
      "gathered enough information",
      "proceed with creating",
    ];

    return completionMarkers.some((marker) =>
      text.toLowerCase().includes(marker.toLowerCase())
    );
  }

  /**
   * Merge extracted data with existing data
   */
  static mergeData(
    existing: Partial<ResumeDataRequirements>,
    extracted: Partial<ResumeDataRequirements>
  ): Partial<ResumeDataRequirements> {
    const merged: Partial<ResumeDataRequirements> = { ...existing };

    // Merge simple fields (strings)
    if (extracted.name) merged.name = extracted.name;
    if (extracted.email) merged.email = extracted.email;
    if (extracted.phone) merged.phone = extracted.phone;
    if (extracted.location) merged.location = extracted.location;
    if (extracted.summary) merged.summary = extracted.summary;

    // Merge arrays (experience, education, skills)
    if (extracted.experience) {
      merged.experience = [
        ...(existing.experience || []),
        ...extracted.experience,
      ];
    }

    if (extracted.education) {
      merged.education = [
        ...(existing.education || []),
        ...extracted.education,
      ];
    }

    if (extracted.skills) {
      // Combine and deduplicate skills
      const allSkills = [...(existing.skills || []), ...extracted.skills];
      merged.skills = [...new Set(allSkills)];
    }

    return merged;
  }

  /**
   * Extract data from entire conversation history
   */
  static extractFromConversation(
    messages: Array<{ content: string; isUser: boolean }>
  ): ExtractionResult {
    const conversationText = messages
      .map((m) => `${m.isUser ? "User" : "AI"}: ${m.content}`)
      .join("\n");

    let aggregatedData: Partial<ResumeDataRequirements> = {};
    let maxConfidence = 0;
    let isComplete = false;

    let lastContext: "education" | "experience" | "skills" | "contact" | null =
      null;

    // Extract from each AI response
    for (const message of messages) {
      if (!message.isUser) {
        const result = this.extract(message.content, conversationText);
        aggregatedData = this.mergeData(aggregatedData, result.data);
        maxConfidence = Math.max(maxConfidence, result.confidence);
        isComplete = isComplete || result.isComplete;

        lastContext = this.detectContext(message.content);
      } else {
        // User Message: Extract using patterns + context
        const userData = this.extractViaPatterns(
          message.content,
          undefined,
          lastContext
        );
        aggregatedData = this.mergeData(aggregatedData, userData);
      }
    }

    // Also extract from user messages (they contain the actual data)
    // Note: We already processed user messages above with context, but the original logic
    // did a second pass. We can keep the original logic for safety or rely on the interleaved loop above.
    // The interleaved loop is better because it has context.
    // However, the original code had two separate loops. Let's stick to the single interleaved loop
    // which is more correct for context.

    return {
      data: aggregatedData,
      confidence: maxConfidence,
      extractedFields: Object.keys(aggregatedData),
      isComplete,
    };
  }
}
