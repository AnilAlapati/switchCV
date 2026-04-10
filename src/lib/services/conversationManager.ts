/**
 * Conversation Manager Service
 *
 * Manages the conversational resume building process:
 * - Tracks which information has been collected
 * - Determines when enough data exists to create a resume
 * - Provides progress feedback
 * - Validates completeness of resume data
 *
 * @module services/conversationManager
 */

export interface ResumeDataRequirements {
  /** User's full name */
  name: string;
  /** Contact email address */
  email: string;
  /** Phone number (optional) */
  phone?: string;
  /** Location/city (optional) */
  location?: string;
  /** GitHub profile URL (optional) */
  github?: string;
  /** LinkedIn profile URL (optional) */
  linkedin?: string;
  /** X (Twitter) profile URL (optional) */
  twitter?: string;
  /** Professional summary or objective */
  summary: string;
  /** Work experience entries */
  experience: ExperienceEntry[];
  /** Educational background */
  education: EducationEntry[];
  /** Professional skills */
  skills: string[];
  /** Personal projects, side projects, freelance work, or open-source contributions */
  projects?: ProjectEntry[];
}

export interface ProjectEntry {
  /** Project name or title */
  name: string;
  /** Brief description of the project */
  description: string;
  /** Technologies used (optional) */
  technologies?: string[];
  /** Project URL or repository link (optional) */
  url?: string;
  /** User's role in the project (optional) */
  role?: string;
}

export interface ExperienceEntry {
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Employment duration */
  duration: string;
  /** Job description or key responsibilities */
  description: string;
  /** Key achievements (optional) */
  achievements?: string[];
}

export interface EducationEntry {
  /** Degree type (e.g., "Bachelor of Science", "B.Tech", "BA", "Class XII") */
  degree: string;
  /** Institution name */
  institution: string;
  /** Graduation year or date range */
  year: string;
  /** Field of study (optional) */
  major?: string;
  /**
   * Academic grade/score — MUST be preserved exactly as stated.
   * USA: GPA (3.8/4.0) | India: CGPA (8.5/10), percentage (85%), marks (80-84.9%)
   * UK: degree classification (First Class, 2:1, 2:2) | Germany: grade (1.3)
   * Stored as `gpa`; `grade` is accepted as an alias from legacy/AI output and
   * is normalized to `gpa` in ConversationManager.updateData().
   */
  gpa?: string;
  /** Alias for gpa — accepted from AI output and normalized on ingest */
  grade?: string;
}

export interface ConversationProgress {
  /** Overall completeness percentage (0-100) */
  completenessPercentage: number;
  /** Fields that have been collected */
  collectedFields: string[];
  /** Fields still missing */
  missingFields: string[];
  /** Whether enough info exists to create resume */
  isReadyToCreate: boolean;
  /** Minimum requirements met */
  hasMinimumData: boolean;
}

/**
 * Resume creation format for final output
 */
export interface ResumeCreationFormat {
  /** Resume title */
  title: string;
  /** Personal contact information */
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  /** Professional summary */
  summary: string;
  /** Work experience entries */
  experience: ExperienceEntry[];
  /** Education background */
  education: EducationEntry[];
  /** Professional skills */
  skills: string[];
  /** Personal projects (optional) */
  projects?: ProjectEntry[];
  /** Method of creation */
  createdVia: "ai-conversation";
}

/**
 * Conversation Manager
 *
 * Orchestrates the conversational resume building flow by tracking
 * collected information and determining completion status.
 */
export class ConversationManager {
  private collectedData: Partial<ResumeDataRequirements>;
  private isComplete: boolean = false;

  /** Minimum required fields to create a basic resume */
  private static readonly MINIMUM_REQUIRED_FIELDS = [
    "name",
    "email",
    "summary",
  ];

  /** Core fields that SHOULD be collected */
  private static readonly CORE_FIELDS = [
    "name",
    "email",
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
  ];

  /** Optional fields that are nice to have */
  private static readonly OPTIONAL_FIELDS = [
    "phone",
    "location",
    "github",
    "linkedin",
    "twitter",
  ];

  /** All tracked fields */
  private static readonly RECOGNIZED_FIELDS = [
    ...ConversationManager.CORE_FIELDS,
    ...ConversationManager.OPTIONAL_FIELDS,
  ];

  constructor(initialData?: Partial<ResumeDataRequirements>) {
    this.collectedData = initialData || {};
  }

  /**
   * Update collected data with new information from conversation.
   * Uses a protective merge: new string fields overwrite only if non-empty,
   * and new arrays overwrite only if they have items. This prevents an
   * incomplete extraction from erasing previously collected data.
   */
  updateData(newData: Partial<ResumeDataRequirements>): void {
    // Normalize education entries: map `grade` → `gpa` so both the AI system
    // prompt output (uses "grade") and the extraction schema (uses "gpa") land
    // in the same canonical field.
    if (Array.isArray(newData.education)) {
      newData = {
        ...newData,
        education: newData.education.map((entry) => {
          if (
            (entry as EducationEntry & { grade?: string }).grade &&
            !entry.gpa
          ) {
            const { grade, ...rest } = entry as EducationEntry & {
              grade?: string;
            };
            return { ...rest, gpa: grade };
          }
          return entry;
        }),
      };
    }

    for (const [key, value] of Object.entries(newData)) {
      if (value === undefined || value === null) continue;

      // For arrays: smart merge to avoid overwriting data from previous turns.
      // Experience/education/projects are merged by key fields; other arrays are replaced.
      if (Array.isArray(value)) {
        if (value.length > 0) {
          const existing = (this.collectedData as Record<string, unknown>)[key];
          if (Array.isArray(existing) && existing.length > 0) {
            if (key === "experience") {
              // Merge by company+title to avoid losing earlier roles
              const merged = [...(existing as ExperienceEntry[])];
              for (const newEntry of value as ExperienceEntry[]) {
                const duplicate = merged.some(
                  (e) =>
                    e.company?.toLowerCase() ===
                      newEntry.company?.toLowerCase() &&
                    e.title?.toLowerCase() === newEntry.title?.toLowerCase(),
                );
                if (!duplicate) merged.push(newEntry);
              }
              (this.collectedData as Record<string, unknown>)[key] = merged;
            } else if (key === "education") {
              // Merge by institution+degree
              const merged = [...(existing as EducationEntry[])];
              for (const newEntry of value as EducationEntry[]) {
                const duplicate = merged.some(
                  (e) =>
                    e.institution?.toLowerCase() ===
                      newEntry.institution?.toLowerCase() &&
                    e.degree?.toLowerCase() === newEntry.degree?.toLowerCase(),
                );
                if (!duplicate) merged.push(newEntry);
              }
              (this.collectedData as Record<string, unknown>)[key] = merged;
            } else if (key === "projects") {
              // Merge by project name
              const merged = [...(existing as ProjectEntry[])];
              for (const newEntry of value as ProjectEntry[]) {
                const duplicate = merged.some(
                  (e) => e.name?.toLowerCase() === newEntry.name?.toLowerCase(),
                );
                if (!duplicate) merged.push(newEntry);
              }
              (this.collectedData as Record<string, unknown>)[key] = merged;
            } else {
              // Other arrays (e.g. skills): replace
              (this.collectedData as Record<string, unknown>)[key] = value;
            }
          } else {
            (this.collectedData as Record<string, unknown>)[key] = value;
          }
        }
        continue;
      }

      // For strings: only overwrite if non-empty
      if (typeof value === "string") {
        if (value.trim().length > 0) {
          // Guard: never overwrite an existing name with a non-name phrase.
          // Phrases like "Interested In Vibecoding" or "Looking For AI Roles"
          // can be mis-extracted from messages like "I am interested in vibecoding".
          if (key === "name") {
            const existing = (this.collectedData as Record<string, unknown>)
              .name;
            if (typeof existing === "string" && existing.trim().length > 0) {
              // Only allow overwrite if the new value looks like a real personal name:
              // 1-3 words, none of which are common non-name words.
              const NON_NAME_WORDS =
                /\b(interested|looking|excited|trying|working|building|learning|passionate|saying|showing|update|preview|understand|unable|wrong|please|fix|create|generate|nothing|much|see|why|how|can|just|resume|i am|i'm|i don't|my|the|a|an|make|suitable|roles|about|for|in|on|at|from|to|into|and|or|so|but|with|by|sir|ok|yes|sure|go ahead)\b/i;
              const wordCount = value.trim().split(/\s+/).length;
              if (NON_NAME_WORDS.test(value) || wordCount > 4) {
                // New extraction looks like a phrase/topic, not a person's name — keep existing
                continue;
              }
            }
          }
          (this.collectedData as Record<string, unknown>)[key] = value;
        }
        continue;
      }

      // Other types: overwrite directly
      (this.collectedData as Record<string, unknown>)[key] = value;
    }
  }

  /**
   * explicitly mark the conversation as complete (e.g. valid JSON generated)
   * This forces the progress to 100% regardless of individual field validation
   */
  markAsComplete(): void {
    this.isComplete = true;
  }

  /**
   * Get current collected data
   */
  getData(): Partial<ResumeDataRequirements> {
    return { ...this.collectedData };
  }

  /**
   * Get conversation progress metrics
   */
  getProgress(): ConversationProgress {
    if (this.isComplete) {
      return {
        completenessPercentage: 100,
        collectedFields: ConversationManager.RECOGNIZED_FIELDS,
        missingFields: [],
        isReadyToCreate: true,
        hasMinimumData: true,
      };
    }

    const collectedFields: string[] = [];
    const missingFields: string[] = [];

    // Check all recognized fields
    for (const field of ConversationManager.RECOGNIZED_FIELDS) {
      const value = this.collectedData[field as keyof ResumeDataRequirements];

      if (this.isFieldPopulated(field, value)) {
        collectedFields.push(field);
      } else if (ConversationManager.CORE_FIELDS.includes(field)) {
        // Only mark as missing if it's a CORE field
        missingFields.push(field);
      }
    }

    // Calculate completeness based on CORE fields only
    // This allows 100% completion without optional fields
    const coreCollected = collectedFields.filter((f) =>
      ConversationManager.CORE_FIELDS.includes(f),
    );

    const completenessPercentage = Math.round(
      (coreCollected.length / ConversationManager.CORE_FIELDS.length) * 100,
    );

    const hasMinimumData = ConversationManager.MINIMUM_REQUIRED_FIELDS.every(
      (field) => {
        const value = this.collectedData[field as keyof ResumeDataRequirements];
        return this.isFieldPopulated(field, value);
      },
    );

    // Ready to create if we have minimum data (completeness logic can be adjusted)
    // Here we stick to: Ready if minimums are met.
    // High bar for "completeness" is 100% of CORE fields.
    const isReadyToCreate = hasMinimumData || completenessPercentage >= 80;

    return {
      completenessPercentage,
      collectedFields,
      missingFields,
      isReadyToCreate,
      hasMinimumData,
    };
  }

  /**
   * Check if a field is populated with valid data
   */
  private isFieldPopulated(
    field: string,
    value:
      | string
      | string[]
      | ExperienceEntry[]
      | EducationEntry[]
      | ProjectEntry[]
      | null
      | undefined,
  ): boolean {
    if (value === null || value === undefined) return false;

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  }

  /**
   * Get next question to ask user based on missing information
   */
  getNextQuestion(): string | null {
    const progress = this.getProgress();

    // If ready to create, return null (no more questions needed)
    if (progress.isReadyToCreate) {
      return null;
    }

    // Ask for minimum required fields first
    for (const field of ConversationManager.MINIMUM_REQUIRED_FIELDS) {
      if (!progress.collectedFields.includes(field)) {
        return this.getQuestionForField(field);
      }
    }

    // Then ask for other important fields
    for (const field of progress.missingFields) {
      return this.getQuestionForField(field);
    }

    return null;
  }

  /**
   * Generate appropriate question for a missing field
   */
  private getQuestionForField(field: string): string {
    const questions: Record<string, string> = {
      name: "What's your full name?",
      email: "What email address would you like to use for your resume?",
      phone: "Would you like to include a phone number?",
      location: "What city or location are you based in?",
      summary:
        "Tell me about yourself and your career goals. What kind of position are you targeting?",
      experience:
        "What's your most recent work experience? Please share the job title, company, and what you did.",
      education: "What's your educational background? Degree and institution?",
      skills:
        "What are your key professional skills? List your strongest technical and soft skills.",
    };

    return (
      questions[field] ||
      `I need more information about your ${field}. Can you tell me about it?`
    );
  }

  /**
   * Validate if data is complete enough to create a resume
   */
  validate(options?: { strictMode?: boolean }): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const progress = this.getProgress();
    const strictMode = options?.strictMode ?? false;

    if (!progress.hasMinimumData) {
      errors.push("Missing required fields for minimum resume");
      errors.push(
        `Required: ${ConversationManager.MINIMUM_REQUIRED_FIELDS.join(", ")}`,
      );
    }

    // Validate email format
    if (this.collectedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.collectedData.email)) {
        errors.push("Invalid email format");
      }
    }

    // Validate arrays are not empty if they exist
    // Only strictly validate if they are in minimum requirements
    if (
      this.collectedData.experience &&
      this.collectedData.experience.length === 0 &&
      ConversationManager.MINIMUM_REQUIRED_FIELDS.includes("experience")
    ) {
      errors.push("Experience array is empty");
    }

    if (
      this.collectedData.education &&
      this.collectedData.education.length === 0 &&
      ConversationManager.MINIMUM_REQUIRED_FIELDS.includes("education")
    ) {
      errors.push("Education array is empty");
    }

    if (
      this.collectedData.skills &&
      this.collectedData.skills.length === 0 &&
      ConversationManager.MINIMUM_REQUIRED_FIELDS.includes("skills")
    ) {
      errors.push("Skills array is empty");
    }

    if (strictMode) {
      const hasExperience =
        Array.isArray(this.collectedData.experience) &&
        this.collectedData.experience.length > 0;
      const hasEducation =
        Array.isArray(this.collectedData.education) &&
        this.collectedData.education.length > 0;
      const hasSkills =
        Array.isArray(this.collectedData.skills) &&
        this.collectedData.skills.length > 0;

      if (!hasExperience && !hasEducation) {
        errors.push("At least one of experience or education is required");
      }

      if (!hasSkills) {
        errors.push("At least one skill is required");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert collected data to resume creation format
   */
  toResumeFormat(): ResumeCreationFormat {
    return {
      title: `${this.collectedData.name}'s Resume` || "My Resume",
      personalInfo: {
        name: this.collectedData.name || "",
        email: this.collectedData.email || "",
        phone: this.collectedData.phone || "",
        location: this.collectedData.location || "",
        github: this.collectedData.github,
        linkedin: this.collectedData.linkedin,
        twitter: this.collectedData.twitter,
      },
      summary: this.collectedData.summary || "",
      experience: this.collectedData.experience || [],
      education: this.collectedData.education || [],
      skills: this.collectedData.skills || [],
      createdVia: "ai-conversation",
    };
  }

  /**
   * Get a user-friendly summary of collected information
   */
  getSummary(): string {
    const progress = this.getProgress();
    const lines: string[] = [];

    lines.push(`📊 Progress: ${progress.completenessPercentage}% complete\n`);

    if (this.collectedData.name) {
      lines.push(`👤 Name: ${this.collectedData.name}`);
    }

    if (this.collectedData.email) {
      lines.push(`📧 Email: ${this.collectedData.email}`);
    }

    if (
      this.collectedData.experience &&
      this.collectedData.experience.length > 0
    ) {
      lines.push(
        `💼 Experience: ${this.collectedData.experience.length} position(s)`,
      );
    }

    if (
      this.collectedData.education &&
      this.collectedData.education.length > 0
    ) {
      lines.push(
        `🎓 Education: ${this.collectedData.education.length} degree(s)`,
      );
    }

    if (this.collectedData.skills && this.collectedData.skills.length > 0) {
      lines.push(`🛠️ Skills: ${this.collectedData.skills.join(", ")}`);
    }

    if (progress.isReadyToCreate) {
      lines.push(`\n✅ You have enough information to create your resume!`);
    } else {
      lines.push(
        `\n⏳ Still need: ${progress.missingFields.slice(0, 3).join(", ")}`,
      );
    }

    return lines.join("\n");
  }
}
