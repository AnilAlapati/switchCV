/**
 * Resume visibility and masking utilities
 * Handles privacy controls and sensitive information display
 */

export type VisibilityLevel = "public" | "masked" | "request";
export type FieldType = "email" | "phone";

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
 * Renders contact field based on visibility settings
 * @param value - The contact information value
 * @param visibility - The visibility level (public, masked, request)
 * @param fieldType - Type of field (email or phone)
 */
export const renderContactField = (
  value: string,
  visibility: VisibilityLevel,
  fieldType: FieldType
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
  items: Array<{ visibility: VisibilityLevel }>
): { public: number; masked: number; request: number } => {
  return items.reduce(
    (acc, item) => {
      acc[item.visibility]++;
      return acc;
    },
    { public: 0, masked: 0, request: 0 }
  );
};

/**
 * Filter items by visibility level
 */
export const filterByVisibility = <T extends { visibility: VisibilityLevel }>(
  items: T[],
  visibility: VisibilityLevel
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
  items: Array<{ visibility: VisibilityLevel }>
): boolean => {
  return items.some((item) => item.visibility === "request");
};

/**
 * Check if any items are masked
 */
export const hasMaskedItems = (
  items: Array<{ visibility: VisibilityLevel }>
): boolean => {
  return items.some((item) => item.visibility === "masked");
};

interface ViewerAccessMeta {
  scope: string;
  isOwner: boolean;
  isMasked?: boolean;
}

/**
 * Produce a sanitized resume payload for public viewers
 * Masks contact details and injects viewer metadata without mutating the source object
 */
export const sanitizeResumeForPublicView = (
  resume: Record<string, any>
): Record<string, any> => {
  const clone = JSON.parse(JSON.stringify(resume ?? {}));

  const originalContact = (resume?.contact ?? {}) as Record<string, any>;
  const originalPersonalInfo = (resume?.personalInfo ?? {}) as Record<
    string,
    any
  >;

  // Get raw values from either contact or personalInfo
  const emailFromContact =
    typeof originalContact.email === "string"
      ? originalContact.email
      : originalContact.email?.value;
  const phoneFromContact =
    typeof originalContact.phone === "string"
      ? originalContact.phone
      : originalContact.phone?.value;

  const rawEmail = emailFromContact || originalPersonalInfo.email || "";
  const rawPhone = phoneFromContact || originalPersonalInfo.phone || "";

  // Determine visibility preference (default to masked if not specified)
  const emailVisibility =
    originalContact.email?.visibility === "request" ? "request" : "masked";
  const phoneVisibility =
    originalContact.phone?.visibility === "request" ? "request" : "masked";

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

  const viewerAccess: ViewerAccessMeta = {
    scope: "public-preview",
    isOwner: false,
    isMasked: true,
  };

  return {
    ...clone,
    contact: sanitizedContact,
    personalInfo: sanitizedPersonalInfo,
    viewerAccess,
  };
};
