import { isFeatureEnabled } from "@/lib/services/featureFlagService";
import type { GenerationQualityReport } from "@/lib/services/resumeService";
import {
  DEFAULT_RESUME_V2_FLAGS,
  collectClaimCandidates,
  buildEvidenceDocuments,
  emptyFactualResult,
  isClaimSupported,
  toErrorMessage,
  isNonEmptyString,
  asRecord,
  isValidSkillEntry,
  buildValidationChecklistItem,
  parseIndexedValidationIssue,
  summarizeExperienceEntry,
  summarizeEducationEntry,
  type BuildQualityReportInput,
  type ResumeV2Flags,
  type EvidenceMessage,
  type FactualAlignmentResult,
} from "@/lib/services/resumeQualityInternals";

// Re-export shared types so external callers continue to use this module
export type {
  ResumeV2Flags,
  EvidenceMessage,
  FactualAlignmentResult,
} from "@/lib/services/resumeQualityInternals";

export function validateStructuredResumeContract(
  resumeData: Record<string, unknown>,
  options?: { strictMode?: boolean },
): string[] {
  const errors: string[] = [];
  const strictMode = options?.strictMode ?? false;

  if (strictMode && !isNonEmptyString(resumeData.name)) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (strictMode && !isNonEmptyString(resumeData.email)) {
    errors.push("Email is required and must be a non-empty string");
  }

  if (isNonEmptyString(resumeData.email)) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resumeData.email.trim())) {
      errors.push("Email must be in a valid format");
    }
  }

  if (strictMode && !isNonEmptyString(resumeData.summary)) {
    errors.push("Summary is required and must be a non-empty string");
  }

  if (resumeData.skills !== undefined) {
    if (!Array.isArray(resumeData.skills)) {
      errors.push("Skills must be an array");
    } else {
      if (strictMode && resumeData.skills.length === 0) {
        errors.push("At least one skill is required");
      }

      resumeData.skills.forEach((skill, index) => {
        if (!isValidSkillEntry(skill)) {
          errors.push(
            `Skill at index ${index} must be a non-empty string or object with name`,
          );
        }
      });
    }
  } else if (strictMode) {
    errors.push("At least one skill is required");
  }

  const experience = resumeData.experience;
  if (experience !== undefined) {
    if (!Array.isArray(experience)) {
      errors.push("Experience must be an array");
    } else {
      // Section-header words that should never appear as a job title.
      // These are misidentified entries extracted from non-experience sections
      // (e.g. "LANGUAGES: English" parsed as title="LANGUAGES", company="English").
      const SECTION_HEADER_TITLES = new Set([
        "languages",
        "language",
        "skills",
        "key skills",
        "technical skills",
        "core competencies",
        "competencies",
        "certification",
        "certifications",
        "licenses",
        "projects",
        "education",
        "summary",
        "objective",
        "profile",
        "about",
        "contact",
        "references",
        "awards",
        "achievements",
        "hobbies",
        "interests",
        "publications",
        "volunteer",
      ]);

      experience.forEach((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          errors.push(`Experience entry at index ${index} must be an object`);
          return;
        }

        const titleValue = (record.title ?? record.role ?? "") as string;
        // Skip validation for entries that are clearly misidentified section headers
        if (SECTION_HEADER_TITLES.has(titleValue.trim().toLowerCase())) {
          return;
        }

        const company = isNonEmptyString(record.company);
        const title =
          isNonEmptyString(record.title) || isNonEmptyString(record.role);
        const description = isNonEmptyString(record.description);
        const achievements = Array.isArray(record.achievements)
          ? record.achievements.filter((achievement) =>
              isNonEmptyString(achievement),
            ).length
          : 0;

        if (!company) {
          errors.push(`Experience entry ${index + 1} is missing company`);
        }
        if (!title) {
          errors.push(`Experience entry ${index + 1} is missing title/role`);
        }
        if (!description && achievements === 0) {
          errors.push(
            `Experience entry ${index + 1} must include description or achievements`,
          );
        }
      });
    }
  }

  const education = resumeData.education;
  if (education !== undefined) {
    if (!Array.isArray(education)) {
      errors.push("Education must be an array");
    } else {
      education.forEach((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          errors.push(`Education entry at index ${index} must be an object`);
          return;
        }

        if (!isNonEmptyString(record.institution)) {
          errors.push(`Education entry ${index + 1} is missing institution`);
        }
        if (!isNonEmptyString(record.degree)) {
          errors.push(`Education entry ${index + 1} is missing degree`);
        }
      });
    }
  }

  if (strictMode) {
    const hasExperience = Array.isArray(experience) && experience.length > 0;
    const hasEducation = Array.isArray(education) && education.length > 0;
    if (!hasExperience && !hasEducation) {
      errors.push("At least one of experience or education is required");
    }
  }

  return [...new Set(errors)];
}

export function buildClarificationChecklist(
  resumeData: Record<string, unknown>,
  validationErrors: string[],
): string[] {
  return validationErrors.slice(0, 5).map((error) => {
    const indexedIssue = parseIndexedValidationIssue(error);
    if (!indexedIssue) {
      return error;
    }

    return buildValidationChecklistItem(indexedIssue, resumeData);
  });
}

export function buildClarificationMessage(
  resumeData: Record<string, unknown>,
  validationErrors: string[],
): string {
  if (validationErrors.length === 0) {
    return (
      "I'm almost ready to create your resume, but I still need a few more " +
      "details. Please share any missing information and I'll continue."
    );
  }

  const experienceEntries = Array.isArray(resumeData.experience)
    ? resumeData.experience
    : [];
  const educationEntries = Array.isArray(resumeData.education)
    ? resumeData.education
    : [];
  const checklist = buildClarificationChecklist(resumeData, validationErrors);

  const formattedIssues = validationErrors.map((error) => {
    const indexedIssue = parseIndexedValidationIssue(error);
    if (!indexedIssue) {
      return `- ${error}`;
    }

    if (indexedIssue.section === "experience") {
      const experienceEntry = asRecord(experienceEntries[indexedIssue.index]);
      const label = `Experience entry ${indexedIssue.index + 1}`;

      if (indexedIssue.kind === "company") {
        return `- ${label}: company is still missing. ${summarizeExperienceEntry(experienceEntry)}`;
      }

      if (indexedIssue.kind === "title") {
        return `- ${label}: title or role is still missing. ${summarizeExperienceEntry(experienceEntry)}`;
      }

      return `- ${label}: I need either a short description of the work or at least one achievement. ${summarizeExperienceEntry(experienceEntry)}`;
    }

    const educationEntry = asRecord(educationEntries[indexedIssue.index]);
    const label = `Education entry ${indexedIssue.index + 1}`;

    if (indexedIssue.kind === "institution") {
      return `- ${label}: institution is still missing. ${summarizeEducationEntry(educationEntry)}`;
    }

    return `- ${label}: degree is still missing. ${summarizeEducationEntry(educationEntry)}`;
  });

  return [
    "You're very close — I just need a few exact details before I can create the resume:",
    "Quick checklist:",
    ...checklist.map((item) => `• ${item}`),
    "",
    "More detail on what I have so far:",
    ...formattedIssues.slice(0, 5),
    "",
    "Fastest reply format: 'Experience entry 1 description: Built...; achievement: Reduced...'.",
  ].join("\n");
}

export async function evaluateResumeV2Flags(): Promise<ResumeV2Flags> {
  try {
    const [
      resume_v2_intake,
      resume_v2_writer,
      resume_v2_templates,
      resume_v2_strict_validation,
      resume_v2_creative_polish,
    ] = await Promise.all([
      isFeatureEnabled("resume_v2_intake"),
      isFeatureEnabled("resume_v2_writer"),
      isFeatureEnabled("resume_v2_templates"),
      isFeatureEnabled("resume_v2_strict_validation"),
      isFeatureEnabled("resume_v2_creative_polish"),
    ]);

    return {
      resume_v2_intake,
      resume_v2_writer,
      resume_v2_templates,
      resume_v2_strict_validation,
      resume_v2_creative_polish,
    };
  } catch {
    return DEFAULT_RESUME_V2_FLAGS;
  }
}

export function evaluateFactualAlignment(
  resumeData: Record<string, unknown>,
  allMessages: EvidenceMessage[],
): FactualAlignmentResult {
  const claims = collectClaimCandidates(resumeData);
  if (claims.length === 0) {
    return emptyFactualResult();
  }

  const evidenceDocs = buildEvidenceDocuments(allMessages);
  if (evidenceDocs.length === 0) {
    return {
      score: 0,
      errors: [
        "Cannot verify generated claims because no user-authored evidence is available",
      ],
      evaluatedClaims: claims.map((claim) => claim.text),
      supportedClaims: [],
      unsupportedClaims: claims.map((claim) => claim.text),
      unsupportedSummaryMetricClaims: claims
        .filter((claim) => claim.kind === "summary_metric")
        .map((claim) => claim.text),
      unsupportedExperienceMetricClaims: claims
        .filter((claim) => claim.kind === "experience_metric")
        .map((claim) => claim.text),
      unsupportedScopeClaims: claims
        .filter((claim) => claim.kind === "scope")
        .map((claim) => claim.text),
      unsupportedNonNumericAssertions: claims
        .filter((claim) => claim.kind === "non_numeric_assertion")
        .map((claim) => claim.text),
    };
  }

  const supportedClaims: string[] = [];
  const unsupportedClaims: string[] = [];
  const unsupportedSummaryMetricClaims: string[] = [];
  const unsupportedExperienceMetricClaims: string[] = [];
  const unsupportedScopeClaims: string[] = [];
  const unsupportedNonNumericAssertions: string[] = [];

  for (const claim of claims) {
    if (isClaimSupported(claim, evidenceDocs)) {
      supportedClaims.push(claim.text);
      continue;
    }

    unsupportedClaims.push(claim.text);
    if (claim.kind === "summary_metric") {
      unsupportedSummaryMetricClaims.push(claim.text);
    } else if (claim.kind === "experience_metric") {
      unsupportedExperienceMetricClaims.push(claim.text);
    } else if (claim.kind === "scope") {
      unsupportedScopeClaims.push(claim.text);
    } else if (claim.kind === "non_numeric_assertion") {
      unsupportedNonNumericAssertions.push(claim.text);
    }
  }

  const score = Number((supportedClaims.length / claims.length).toFixed(2));

  const errors = [
    toErrorMessage(
      "Unverified summary metric claims",
      unsupportedSummaryMetricClaims,
    ),
    toErrorMessage(
      "Unverified experience metric claims",
      unsupportedExperienceMetricClaims,
    ),
    toErrorMessage("Unverified scope claims", unsupportedScopeClaims),
    toErrorMessage(
      "Unverified non-numeric assertions",
      unsupportedNonNumericAssertions,
    ),
  ].filter((error): error is string => !!error);

  return {
    score,
    errors,
    evaluatedClaims: claims.map((claim) => claim.text),
    supportedClaims,
    unsupportedClaims,
    unsupportedSummaryMetricClaims,
    unsupportedExperienceMetricClaims,
    unsupportedScopeClaims,
    unsupportedNonNumericAssertions,
  };
}

export function buildQualityReport({
  schemaValid,
  validationErrors,
  regenerationAttempts = 0,
  factualAlignmentScore = 1,
}: BuildQualityReportInput): GenerationQualityReport {
  return {
    schemaValid,
    factualAlignmentScore,
    validationErrors,
    regenerationAttempts,
  };
}

export function buildRepairPrompt(
  originalResponseText: string,
  currentData: Record<string, unknown>,
  validationErrors: string[],
  allMessages?: EvidenceMessage[],
): string {
  const userEvidence = (allMessages || [])
    .filter((entry) => entry.isUser)
    .map((entry) => entry.content.trim())
    .filter((entry) => entry.length > 0)
    .slice(-8);

  return [
    "Repair the resume JSON so it passes validation.",
    "Return strict JSON only, with no markdown or explanation.",
    "Do not fabricate facts or metrics.",
    `Validation errors: ${validationErrors.join("; ")}`,
    "Current candidate data:",
    JSON.stringify(currentData),
    userEvidence.length > 0 ? "Recent user-authored evidence:" : "",
    userEvidence.length > 0 ? JSON.stringify(userEvidence) : "",
    "Original model response:",
    originalResponseText,
  ].join("\n");
}

export function buildEvidenceMap(
  collectedData: Record<string, unknown>,
  allMessages: EvidenceMessage[],
): Record<string, string[]> {
  const userMessages = allMessages
    .filter((entry) => entry.isUser)
    .map((entry) => entry.content.trim())
    .filter((entry) => entry.length > 0);

  const evidenceMap: Record<string, string[]> = {};
  const searchableCorpus = userMessages.join("\n");

  for (const [field, value] of Object.entries(collectedData)) {
    if (typeof value === "string" && value.trim().length > 0) {
      const sourceMatches = userMessages.filter((msg) =>
        msg.toLowerCase().includes(value.toLowerCase()),
      );
      evidenceMap[field] =
        sourceMatches.length > 0 ? sourceMatches.slice(0, 3) : [value];
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      const rawStrings = value
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object") return JSON.stringify(entry);
          return "";
        })
        .filter((entry) => entry.length > 0);

      const matches = rawStrings.filter((entry) =>
        searchableCorpus.toLowerCase().includes(entry.toLowerCase()),
      );

      evidenceMap[field] = (matches.length > 0 ? matches : rawStrings).slice(
        0,
        3,
      );
    }
  }

  if (!evidenceMap.rawUserInput && userMessages.length > 0) {
    evidenceMap.rawUserInput = userMessages.slice(0, 5);
  }

  return evidenceMap;
}
