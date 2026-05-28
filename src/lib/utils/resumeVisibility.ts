/**
 * Resume visibility and masking utilities
 * Handles privacy controls and sensitive information display
 */

export type VisibilityLevel = "public" | "masked" | "request";
export type FieldType = "email" | "phone";

/**
 * Controls what public viewers see when the resume is set to public.
 * - "snapshot": contact details masked, experience/education/projects/skills hidden
 * - "full": contact details masked, all sections visible
 */
export type PublicViewMode = "snapshot" | "full";

/**
 * Canonical visibility resolution for resume data.
 * This is the SINGLE SOURCE OF TRUTH for determining if a resume is publicly visible.
 *
 * INVARIANT: If isBeingEdited is true, the resume is NEVER public — regardless of
 * other field values. This prevents data leakage during editing.
 *
 * @param resume - Resume data with visibility-related fields
 * @returns true if the resume should be publicly visible
 */
export function resolveResumeIsPublic(
  resume:
    | {
        isBeingEdited?: boolean;
        isPublic?: boolean;
        visibility?: string;
        published?: boolean;
        publishedAt?: string;
      }
    | null
    | undefined,
): boolean {
  if (!resume) return false;

  // INVARIANT: A resume being edited is NEVER public
  if (resume.isBeingEdited === true) return false;

  // Check explicit boolean field first (authoritative)
  if (typeof resume.isPublic === "boolean") return resume.isPublic;

  // Check string visibility field
  if (resume.visibility === "public") return true;

  // Check legacy published field
  if (resume.published === true) return true;

  // Check if ever published (legacy fallback)
  if (resume.publishedAt) return true;

  return false;
}

/**
 * Validates resume state invariants.
 * Throws if the resume is in an inconsistent state.
 *
 * @param resume - Resume data to validate
 * @param resumeId - ID for error reporting
 * @throws Error if invariants are violated
 */
export function validateResumeVisibilityInvariants(
  resume: {
    isBeingEdited?: boolean;
    isPublic?: boolean;
    visibility?: string;
  },
  resumeId: string | number,
): void {
  if (resume.isBeingEdited === true) {
    if (resume.isPublic === true) {
      throw new Error(
        `INVARIANT VIOLATION: Resume ${resumeId} is being edited but isPublic is true`,
      );
    }
    if (resume.visibility === "public") {
      throw new Error(
        `INVARIANT VIOLATION: Resume ${resumeId} is being edited but visibility is "public"`,
      );
    }
  }
}

/**
 * Masks email address to protect privacy
 * Shows only first character and domain
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  return `${localPart[0]}***@${domain}`;
};

/**
 * Masks phone number to protect privacy
 * Shows only last 4 digits
 */
export const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length < 4) return "***-***-****";
  return `***-***-${cleaned.slice(-4)}`;
};

/**
 * Masks candidate name to protect privacy
 * Shows first name and the initial of the surname/second part (e.g. "Anil Alapati" -> "Anil A.")
 */
export const maskName = (name: string): string => {
  if (!name) return "";
  const clean = name.trim();
  if (!clean) return "";
  const parts = clean.split(/\s+/);
  if (parts.length <= 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const secondPart = parts[1];
  const initial = secondPart.charAt(0).toUpperCase();
  return `${firstName} ${initial}.`;
};


/**
 * Renders contact field based on visibility settings
 * @param value - The contact information value
 * @param visibility - The visibility level (public, masked, request)
 * @param fieldType - Type of field (email or phone)
 */
export const renderContactField = (
  value: string,
  visibility: VisibilityLevel,
  fieldType: FieldType,
): string => {
  if (visibility === "public") {
    return value;
  }

  if (visibility === "masked") {
    return fieldType === "email" ? maskEmail(value) : maskPhone(value);
  }

  // visibility === "request"
  return "Available upon request";
};

/**
 * Count visibility occurrences in a collection
 */
export const countVisibility = (
  items: Array<{ visibility: VisibilityLevel }>,
): { public: number; masked: number; request: number } => {
  return items.reduce(
    (acc, item) => {
      acc[item.visibility]++;
      return acc;
    },
    { public: 0, masked: 0, request: 0 },
  );
};

/**
 * Filter items by visibility level
 */
export const filterByVisibility = <T extends { visibility: VisibilityLevel }>(
  items: T[],
  visibility: VisibilityLevel,
): T[] => {
  return items.filter((item) => item.visibility === visibility);
};

/**
 * Parse enhanced content from AI generation
 */
export const parseEnhancedContent = (content: unknown) => {
  try {
    if (typeof content === "string") {
      return JSON.parse(content);
    }
    return content || {};
  } catch {
    return {};
  }
};

/**
 * Check if any items require access request
 */
export const hasRequestItems = (
  items: Array<{ visibility: VisibilityLevel }>,
): boolean => {
  return items.some((item) => item.visibility === "request");
};

/**
 * Check if any items are masked
 */
export const hasMaskedItems = (
  items: Array<{ visibility: VisibilityLevel }>,
): boolean => {
  return items.some((item) => item.visibility === "masked");
};

import type { ViewerAccessMeta } from "@/types";

/**
 * Typed return shape for sanitizeResumeForPublicView.
 * Provides type-safe access to contact, personalInfo, and viewerAccess.
 */
export interface SanitizedContactField {
  value: string;
  visibility: string;
}

export interface SanitizedContact {
  email: SanitizedContactField;
  phone: SanitizedContactField;
}

export interface SanitizedResumeResult extends Record<string, unknown> {
  contact: SanitizedContact;
  personalInfo: Record<string, unknown>;
  viewerAccess: ViewerAccessMeta & { isMasked?: boolean; isSnapshot?: boolean };
  experience: unknown[];
  education: unknown[];
  projects: unknown[];
  skills: unknown[];
}

/**
 * Produce a sanitized resume payload for public viewers
 * Masks contact details and injects viewer metadata without mutating the source object
 */
export const sanitizeResumeForPublicView = (
  resume: Record<string, unknown>,
): SanitizedResumeResult => {
  const clone = JSON.parse(JSON.stringify(resume ?? {})) as Record<
    string,
    unknown
  >;

  const originalContact = (resume?.contact ?? {}) as Record<string, unknown>;
  const originalPersonalInfo = (resume?.personalInfo ?? {}) as Record<
    string,
    unknown
  >;

  // Get raw values from either contact or personalInfo
  const emailFromContact =
    typeof originalContact.email === "string"
      ? originalContact.email
      : ((originalContact.email as Record<string, unknown>)?.value as
          | string
          | undefined);
  const phoneFromContact =
    typeof originalContact.phone === "string"
      ? originalContact.phone
      : ((originalContact.phone as Record<string, unknown>)?.value as
          | string
          | undefined);

  const rawEmail =
    emailFromContact || (originalPersonalInfo.email as string) || "";
  const rawPhone =
    phoneFromContact || (originalPersonalInfo.phone as string) || "";

  // Determine visibility preference (default to masked if not specified)
  const emailVisibility =
    (originalContact.email as Record<string, unknown>)?.visibility === "request"
      ? "request"
      : "masked";
  const phoneVisibility =
    (originalContact.phone as Record<string, unknown>)?.visibility === "request"
      ? "request"
      : "masked";

  // Generate masked values
  const maskedEmail = rawEmail ? maskEmail(rawEmail) : "";
  const maskedPhone = rawPhone ? maskPhone(rawPhone) : "";

  // Create sanitized contact object
  const sanitizedContact = {
    email: {
      value: emailVisibility === "request" ? "" : maskedEmail,
      visibility: emailVisibility,
    },
    phone: {
      value: phoneVisibility === "request" ? "" : maskedPhone,
      visibility: phoneVisibility,
    },
  };

  // Create sanitized personalInfo object
  const sanitizedPersonalInfo = { ...originalPersonalInfo };

  // Overwrite personalInfo fields with masked values or remove them
  if (sanitizedPersonalInfo.email) {
    sanitizedPersonalInfo.email =
      emailVisibility === "request" ? "Available upon request" : maskedEmail;
  }
  if (sanitizedPersonalInfo.phone) {
    sanitizedPersonalInfo.phone =
      phoneVisibility === "request" ? "Available upon request" : maskedPhone;
  }
  if (typeof sanitizedPersonalInfo.name === "string") {
    sanitizedPersonalInfo.name = maskName(sanitizedPersonalInfo.name);
  }

  // Also mask top-level names on clone if present
  if (typeof clone.name === "string") {
    clone.name = maskName(clone.name);
  }
  if (typeof clone.userName === "string") {
    clone.userName = maskName(clone.userName);
  }


  const viewerAccess: ViewerAccessMeta & {
    isMasked?: boolean;
    isSnapshot?: boolean;
  } = {
    scope: "public-preview",
    isOwner: false,
    isMasked: true,
    isSnapshot: true,
  };

  return {
    ...clone,
    contact: sanitizedContact,
    personalInfo: sanitizedPersonalInfo,
    experience: [],
    education: [],
    projects: [],
    skills: [],
    viewerAccess,
  } as SanitizedResumeResult;
};

/**
 * Produce a sanitized resume payload for public viewers in "full" mode.
 * All sections (experience, education, projects, skills) are retained.
 * Contact details are still masked to protect privacy.
 */
export const sanitizeResumeForFullPublicView = (
  resume: Record<string, unknown>,
): SanitizedResumeResult => {
  const snapshot = sanitizeResumeForPublicView(resume);
  const clone = JSON.parse(JSON.stringify(resume ?? {})) as Record<
    string,
    unknown
  >;

  return {
    ...clone,
    contact: snapshot.contact,
    personalInfo: snapshot.personalInfo,
    experience: (clone.experience as unknown[]) ?? [],
    education: (clone.education as unknown[]) ?? [],
    projects: (clone.projects as unknown[]) ?? [],
    skills: (clone.skills as unknown[]) ?? [],
    viewerAccess: {
      scope: "public-preview",
      isOwner: false,
      isMasked: true,
      isSnapshot: false,
    },
  } as SanitizedResumeResult;
};
