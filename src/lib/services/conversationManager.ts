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
  /** Degree type (e.g., "Bachelor of Science") */
  degree: string;
  /** Institution name */
  institution: string;
  /** Graduation year or date range */
  year: string;
  /** Field of study (optional) */
  major?: string;
  /** GPA (optional) */
  gpa?: string;
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
   * Update collected data with new information from conversation
   */
  updateData(newData: Partial<ResumeDataRequirements>): void {
    this.collectedData = {
      ...this.collectedData,
      ...newData,
    };
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
    const coreCollected = collectedFields.filter(f => ConversationManager.CORE_FIELDS.includes(f));

    const completenessPercentage = Math.round(
      (coreCollected.length / ConversationManager.CORE_FIELDS.length) * 100
    );

    const hasMinimumData = ConversationManager.MINIMUM_REQUIRED_FIELDS.every(
      (field) => {
        const value = this.collectedData[field as keyof ResumeDataRequirements];
        return this.isFieldPopulated(field, value);
      }
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
      | null
      | undefined
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
  validate(options?: { strictMode?: boolean }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const progress = this.getProgress();
    const strictMode = options?.strictMode ?? false;

    if (!progress.hasMinimumData) {
      errors.push("Missing required fields for minimum resume");
      errors.push(
        `Required: ${ConversationManager.MINIMUM_REQUIRED_FIELDS.join(", ")}`
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
        `💼 Experience: ${this.collectedData.experience.length} position(s)`
      );
    }

    if (
      this.collectedData.education &&
      this.collectedData.education.length > 0
    ) {
      lines.push(
        `🎓 Education: ${this.collectedData.education.length} degree(s)`
      );
    }

    if (this.collectedData.skills && this.collectedData.skills.length > 0) {
      lines.push(`🛠️ Skills: ${this.collectedData.skills.join(", ")}`);
    }

    if (progress.isReadyToCreate) {
      lines.push(`\n✅ You have enough information to create your resume!`);
    } else {
      lines.push(
        `\n⏳ Still need: ${progress.missingFields.slice(0, 3).join(", ")}`
      );
    }

    return lines.join("\n");
  }
}
