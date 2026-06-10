import * as functions from "firebase-functions";
import type { ResumeData } from "../types";

const ALLOWED_TONES = ["professional", "creative", "concise"] as const;
const ALLOWED_TEMPLATES = [
  "modern",
  "classic",
  "creative",
  "minimal",
  "professional",
] as const;

export type ResumeTone = (typeof ALLOWED_TONES)[number];
export type ResumeTemplate = (typeof ALLOWED_TEMPLATES)[number];

type SanitizedRequestBody = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== "string") {
    throw new ValidationError("Input must be a string");
  }

  // Remove any null bytes
  let sanitized = input.replace(/\0/g, "");

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength);

  return sanitized;
}

/**
 * Sanitize HTML/script content
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate user ID format (Firebase UID)
 */
export function validateUserId(userId: unknown): string {
  if (typeof userId !== "string") {
    throw new ValidationError("User ID must be a string", "userId");
  }

  if (userId.length < 1 || userId.length > 128) {
    throw new ValidationError(
      "User ID must be between 1 and 128 characters",
      "userId",
    );
  }

  // Firebase UIDs are alphanumeric
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new ValidationError("Invalid user ID format", "userId");
  }

  return userId;
}

/**
 * Validate model ID against allowed list
 */
export function validateModelId<TModel extends string>(
  modelId: unknown,
  allowedModels: readonly TModel[],
): TModel {
  if (typeof modelId !== "string") {
    throw new ValidationError("Model ID must be a string", "modelId");
  }

  if (!allowedModels.includes(modelId as TModel)) {
    throw new ValidationError(
      `Invalid model: ${modelId}. Allowed models: ${allowedModels.join(", ")}`,
      "modelId",
      "INVALID_MODEL",
    );
  }

  return modelId as TModel;
}

/**
 * Validate resume data structure
 */
export function validateResumeData(data: unknown): asserts data is ResumeData {
  if (!isRecord(data)) {
    throw new ValidationError("Resume data must be an object", "resumeData");
  }

  // Validate personal info
  if (!isRecord(data.personalInfo)) {
    throw new ValidationError(
      "Personal info is required",
      "resumeData.personalInfo",
    );
  }

  const { name, email } = data.personalInfo;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError(
      "Name is required",
      "resumeData.personalInfo.name",
    );
  }

  if (!email || typeof email !== "string" || !validateEmail(email)) {
    throw new ValidationError(
      "Valid email is required",
      "resumeData.personalInfo.email",
    );
  }

  // Validate summary — required unless experience entries are present (orchestrator auto-generates it)
  const hasExperience =
    Array.isArray(data.experience) && data.experience.length > 0;
  if ((!data.summary || typeof data.summary !== "string") && !hasExperience) {
    throw new ValidationError(
      "Summary is required when no experience entries are provided",
      "resumeData.summary",
    );
  }

  if (typeof data.summary === "string" && data.summary.length > 5000) {
    throw new ValidationError(
      "Summary must be less than 5000 characters",
      "resumeData.summary",
    );
  }

  // Validate experience array
  if (!Array.isArray(data.experience)) {
    throw new ValidationError(
      "Experience must be an array",
      "resumeData.experience",
    );
  }

  data.experience.forEach((exp: unknown, index: number) => {
    if (!isRecord(exp)) {
      throw new ValidationError(
        `Experience ${index} must be an object`,
        `resumeData.experience[${index}]`,
      );
    }
    if (!exp.title || typeof exp.title !== "string") {
      throw new ValidationError(
        `Experience ${index} must have a title`,
        `resumeData.experience[${index}].title`,
      );
    }
    if (!exp.company || typeof exp.company !== "string") {
      throw new ValidationError(
        `Experience ${index} must have a company`,
        `resumeData.experience[${index}].company`,
      );
    }
    if (!exp.description || typeof exp.description !== "string") {
      throw new ValidationError(
        `Experience ${index} must have a description`,
        `resumeData.experience[${index}].description`,
      );
    }
  });

  // Validate education array
  if (!Array.isArray(data.education)) {
    throw new ValidationError(
      "Education must be an array",
      "resumeData.education",
    );
  }

  // Validate skills array
  if (!Array.isArray(data.skills)) {
    throw new ValidationError("Skills must be an array", "resumeData.skills");
  }

  if (data.skills.length === 0) {
    throw new ValidationError(
      "At least one skill is required",
      "resumeData.skills",
    );
  }

  data.skills.forEach((skill: unknown, index: number) => {
    if (typeof skill !== "string") {
      throw new ValidationError(
        `Skill ${index} must be a string`,
        `resumeData.skills[${index}]`,
      );
    }
  });
}

/**
 * Validate job description
 */
export function validateJobDescription(description: unknown): string {
  if (typeof description !== "string") {
    throw new ValidationError(
      "Job description must be a string",
      "jobDescription",
    );
  }

  if (description.trim().length === 0) {
    throw new ValidationError(
      "Job description cannot be empty",
      "jobDescription",
    );
  }

  if (description.length > 10000) {
    throw new ValidationError(
      "Job description must be less than 10000 characters",
      "jobDescription",
    );
  }

  return sanitizeString(description, 10000);
}

/**
 * Validate tone parameter
 */
export function validateTone(tone: unknown): ResumeTone {
  if (typeof tone !== "string") {
    throw new ValidationError("Tone must be a string", "tone");
  }

  if (!ALLOWED_TONES.includes(tone as ResumeTone)) {
    throw new ValidationError(
      `Invalid tone. Allowed values: ${ALLOWED_TONES.join(", ")}`,
      "tone",
    );
  }

  return tone as ResumeTone;
}

/**
 * Validate template parameter
 */
export function validateTemplate(template: unknown): ResumeTemplate {
  if (typeof template !== "string") {
    throw new ValidationError("Template must be a string", "template");
  }

  if (!ALLOWED_TEMPLATES.includes(template as ResumeTemplate)) {
    throw new ValidationError(
      `Invalid template. Allowed values: ${ALLOWED_TEMPLATES.join(", ")}`,
      "template",
    );
  }

  return template as ResumeTemplate;
}

/**
 * Generic object validator
 */
export function validateObject(
  obj: unknown,
  requiredFields: string[],
  fieldName: string = "object",
): void {
  if (!isRecord(obj)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName);
  }

  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new ValidationError(
        `Missing required field: ${field}`,
        `${fieldName}.${field}`,
      );
    }
  }
}

/**
 * Handle validation errors in Cloud Functions
 */
export function handleValidationError(
  error: unknown,
  context: string = "request",
): never {
  if (error instanceof ValidationError) {
    functions.logger.warn("Validation error", {
      context,
      field: error.field,
      message: error.message,
      code: error.code,
    });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid input. Please check your data and try again.",
      {
        field: error.field,
        code: error.code,
      },
    );
  }

  // Re-throw unexpected errors
  throw error;
}

/**
 * Sanitize and validate entire request body
 */
export function sanitizeRequestBody(body: unknown): SanitizedRequestBody {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be an object");
  }

  const sanitized: SanitizedRequestBody = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item,
      );
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
