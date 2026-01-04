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

// Helper for title casing names
const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

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
    // Extract name - Case insensitive and auto-capitalized
    // Extract name - Case insensitive and auto-capitalized
    // Prevent capturing "and", "with", "but" as part of the name using negative lookahead
    const namePatterns = [
      /(?:[Mm]y name is|[Ii]'m|[Ii] am|[Cc]all me)\s+([a-zA-Z]+(?:\s+(?!and\b|with\b|but\b)[a-zA-Z]+|[a-zA-Z]\.?){0,3})(?=\s|$|[.,])/i,
      /[Nn]ame:\s*([a-zA-Z]+(?:\s+(?!and\b|with\b|but\b)[a-zA-Z]+|[a-zA-Z]\.?){0,3})(?=\s|$|[.,])/i,
      // Fallback: 2-3 words that look like a name. Stricter than above to avoid false positives.
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$/,
    ];

    for (const pattern of namePatterns) {
      const match = trimmedText.match(pattern) || fullText.match(pattern);
      if (match && match[1]) {
        // Fix capitalization
        data.name = toTitleCase(match[1].trim());
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
    // Extract phone - Support international formats
    // Allow +Prefix, spaces, dots, dashes. Min 7 digits, Max 15.
    const phoneRegex =
      /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const phoneMatch = fullText.match(phoneRegex);
    if (phoneMatch) {
      // Validate length to avoid picking up years like "2020-2021"
      const digits = phoneMatch[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15) {
        data.phone = phoneMatch[0].trim();
      }
    }

    // Extract location (city, state/country) - Supports international
    const locationPatterns = [
      /(?:located in|based in|live in)\s+([a-zA-Z]+(?: [a-zA-Z]+)?(?:,?\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)?))/i,
      /location:\s*([a-zA-Z]+(?: [a-zA-Z]+)?(?:,?\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)?))/i,
      // "from" requires strict City, State/Country
      /from\s+([a-zA-Z]+(?: [a-zA-Z]+)?,\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      // City, State/Country format (generic)
      /([a-zA-Z]+(?: [a-zA-Z]+)?,\s*([a-zA-Z]{2,}))/i,
    ];

    // Removed strict US State code check to support international locations
    // We still do validation below but less strict
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
        // For the last pattern (generic City, Region), just ensure the region is 2+ chars
        if (pattern.source.includes("([a-zA-Z]{2,}))")) {
          // We accept it if it looks like City, Region
          data.location = match[1].trim();
          break;
        } else if (match[1]) {
          data.location = match[1].trim();
          break;
        }
      }
    }

    // Extract Summary - NEW
    const summaryPatterns = [
      /(?:summary|professional summary|objective|about me):\s*(.+)(?:\n|$)/i,
      /^Summary:\s*(.+)/m,
    ];

    for (const pattern of summaryPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        data.summary = match[1].trim();
        break;
      }
    }

    // Extract skills (comma or bullet separated lists)
    // Updated to allow dots in skill names (e.g. Node.js, .NET) but stop at newline
    const skillsPatterns = [
      /skills?:\s*([^\n]+)/i,
      // Support "proficient in" with or without colon
      /(?:proficient|skilled|experienced|competent)\s+(?:in|with)(?::|)\s+([^\n]+)/i,
      /technologies?:\s*([^\n]+)/i,
      /(?:I know|I use|experience with)\s+([^\n]+)/i,
    ];

    // 1. Try explicit patterns first
    for (const pattern of skillsPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const skillsList = match[1]
          .split(/,|;|\n|\s+and\s+/)
          .map((s) => s.trim().replace(/\.$/, "")) // Remove trailing dot
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
        "Svelte",
        "Vue",
        "Nuxt",
        "Next.js",
        "Tailwind",
        "Bootstrap",
        "Sass",
        "Less",
        "GraphQL",
        "MongoDB",
        "PostgreSQL",
        "Firebase",
        "Supabase",
        "Flutter",
        "React Native",
        "Swift",
        "Kotlin",
        "PHP",
        "Ruby",
        "Rails",
        "Laravel",
        "Django",
        "Flask",
        "FastAPI",
        "Spring",
        ".NET",
        "Azure",
        "GCP",
        "Linux",
        "Bash",
        "Redis",
        "Elasticsearch",
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
          // Also handle "and" as a separator to fix "andNext.js" issues
          const hasComma = line.includes(",");
          const parts = hasComma
            ? line.split(/,|;|\s+and\s+/)
            : line.split(/\s+and\s+|\s+/);

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
      "currently working",
      "i'm a",
      "i am a",
      "i'm working",
      "i am working",
      "working as",
      "senior software engineer", // Common job titles as keywords
      "software engineer",
      "developer",
      "engineer",
      "manager",
    ];
    const hasExperience = experienceKeywords.some((kw) =>
      fullText.toLowerCase().includes(kw)
    );

    // Context-aware Experience Section Extraction
    // Look for headers like "Professional Experience" followed by content
    const experienceSectionRegex =
      /(?:Professional Experience|Work History|Experience|Employment History)(?::|)\s*([\s\S]+?)(?=(?:\n\s*(?:Education|Skills|Projects|Reference)|$))/i;
    const sectionMatch = fullText.match(experienceSectionRegex);

    // If we find a section, prioritize extracting from it
    const textToSearch = sectionMatch ? sectionMatch[1] : fullText;

    if (hasExperience || /@/.test(textToSearch) || sectionMatch) {
      // @ often used for "Title @ Company"
      // Extract company and title
      const expPatterns = [
        // Bullet point format: "- Title at Company" or "- Title | Company"
        // Group 1: Title, Group 2: Company
        /(?:^|\n)\s*[-•]\s*([A-Za-z0-9\s]+?)\s+(?:at|\||@)\s+([A-Za-z0-9\s]+)(?=\n|$)/,

        // Standard "Title at Company"
        // Group 1: Title, Group 2: Company
        /(?:worked|work|employed|position|job|role)\s+(?:as|at)\s+((?:(?! at ).)+)(?:\s+at\s+([^,.\n]+))?/i,

        // "Title @ Company"
        // Group 1: Title, Group 2: Company
        /([A-Za-z\s]+)\s+@\s+([A-Za-z\s]+)/,

        // "I spent X years at Company"
        // Group 1: Company
        /(?:spent|worked)\s+(?:.*?)\s+at\s+([A-Za-z\s]+)/i,

        // Block format in section: "Title [newline] Company"
        // Group 1: Title, Group 2: Company
        // Prevent capturing "Professional Experience" itself by ensuring Title doesn't look like a header
        /(?:^|\n)(?!Professional Experience|Work History|Experience)([A-Z][a-zA-Z0-9\s]+?)\s*\n\s*(?:at\s+)?([A-Z][a-zA-Z0-9\s]+?)(?=\s*\n|\s+\d{4})/,

        // Single line "Title at Company" within a section (fallback if bullets miss it)
        // Group 1: Title, Group 2: Company
        /(?:^|\n)([A-Za-z0-9\s]+?)\s+(?:at|@)\s+([A-Za-z0-9\s]+?)(?=\s*\n|$)/,
      ];

      for (const pattern of expPatterns) {
        const expMatch = textToSearch.match(pattern);
        if (expMatch) {
          let title = "Professional";
          let company = "Company";

          if (pattern.source.includes("spent")) {
            // For "spent ... at", group 1 is company
            company = expMatch[1].trim();
          } else {
            // Standard: 1=Title, 2=Company
            title = expMatch[1]?.trim() || "Professional";
            company = expMatch[2]?.trim() || "Company";
          }

          const experience: ExperienceEntry = {
            title,
            company,
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
      "went to",
      "attending",
      "enrolled at",
      "i'm at",
      "i am at",
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
