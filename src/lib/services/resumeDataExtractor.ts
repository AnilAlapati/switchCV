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
  private static extractJSONData(text: string): any | null {
    try {
      // Look for JSON code blocks
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = text.match(jsonBlockRegex);

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Look for RESUME_DATA marker
      const dataMarkerRegex = /RESUME_DATA:\s*({[\s\S]*?})/;
      const dataMatch = text.match(dataMarkerRegex);

      if (dataMatch && dataMatch[1]) {
        return JSON.parse(dataMatch[1].trim());
      }

      // Look for any JSON object
      const jsonObjectRegex = /{[\s\S]*?}/;
      const objectMatch = text.match(jsonObjectRegex);

      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]);
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
   * Extract data using regex patterns
   */
  private static extractViaPatterns(
    text: string,
    history?: string
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
      // Relaxed fallback for name (allow case insensitive if it's short and looks like a name)
      /^([A-Za-z]+(?:\s+(?:[A-Za-z]+|[A-Za-z]\.?)){1,3})$/,
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
      /(?:located in|based in|from|live in)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?(?:,?\s+[A-Z]{2})?)/i,
      /location:\s*([A-Z][a-z]+(?: [A-Z][a-z]+)?(?:,?\s+[A-Z]{2})?)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        data.location = match[1].trim();
        break;
      }
    }

    // Extract skills (comma or bullet separated lists)
    const skillsPatterns = [
      /skills?:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
      /proficient in:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
      /technologies?:\s*([^.\n]+(?:,\s*[^.\n]+)*)/i,
    ];

    for (const pattern of skillsPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const skillsList = match[1]
          .split(/,|;|\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 50);
        if (skillsList.length > 0) {
          data.skills = skillsList;
          break;
        }
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
    ];
    const hasExperience = experienceKeywords.some((kw) =>
      fullText.toLowerCase().includes(kw)
    );

    if (hasExperience) {
      // Extract company and title
      // Improved regex to better separate title and company
      const expPattern =
        /(?:worked|work|employed|position|job|role)\s+(?:as|at)\s+((?:(?! at ).)+)(?:\s+at\s+([^,.\n]+))?/i;
      const expMatch = fullText.match(expPattern);

      if (expMatch) {
        const experience: ExperienceEntry = {
          title: expMatch[1]?.trim() || "Professional",
          company: expMatch[2]?.trim() || "Company",
          duration: "Present",
          description: "Contributed to various projects and initiatives",
        };
        data.experience = [experience];
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
    ];
    const hasEducation = educationKeywords.some((kw) =>
      fullText.toLowerCase().includes(kw)
    );

    if (hasEducation) {
      const eduPattern =
        /(bachelor|master|phd|associate|doctorate|degree)(?:['\s]+(?:of|in))?\s+([^,.\n]+)?\s+(?:from|at)?\s*([^,.\n]+)/i;
      const eduMatch = fullText.match(eduPattern);

      if (eduMatch) {
        const education: EducationEntry = {
          degree: eduMatch[1]
            ? `${eduMatch[1]} ${eduMatch[2] || ""}`.trim()
            : "Degree",
          institution: eduMatch[3]?.trim() || "University",
          year: new Date().getFullYear().toString(),
        };
        data.education = [education];
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
    const merged: any = { ...existing };

    // Merge simple fields (strings)
    for (const key of ["name", "email", "phone", "location", "summary"]) {
      if (extracted[key as keyof ResumeDataRequirements]) {
        merged[key] = extracted[key as keyof ResumeDataRequirements];
      }
    }

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

    // Extract from each AI response
    for (const message of messages) {
      if (!message.isUser) {
        const result = this.extract(message.content, conversationText);
        aggregatedData = this.mergeData(aggregatedData, result.data);
        maxConfidence = Math.max(maxConfidence, result.confidence);
        isComplete = isComplete || result.isComplete;
      }
    }

    // Also extract from user messages (they contain the actual data)
    for (const message of messages) {
      if (message.isUser) {
        const userData = this.extractViaPatterns(message.content);
        aggregatedData = this.mergeData(aggregatedData, userData);
      }
    }

    return {
      data: aggregatedData,
      confidence: maxConfidence,
      extractedFields: Object.keys(aggregatedData),
      isComplete,
    };
  }
}
