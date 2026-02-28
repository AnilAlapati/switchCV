import { isFeatureEnabled } from "@/lib/services/featureFlagService";
import type { GenerationQualityReport } from "@/lib/services/resumeService";

export interface ResumeV2Flags {
  resume_v2_intake: boolean;
  resume_v2_writer: boolean;
  resume_v2_templates: boolean;
  resume_v2_strict_validation: boolean;
  resume_v2_creative_polish: boolean;
}

export interface EvidenceMessage {
  content: string;
  isUser: boolean;
}

export interface FactualAlignmentResult {
  score: number;
  errors: string[];
  evaluatedClaims: string[];
  supportedClaims: string[];
  unsupportedClaims: string[];
  unsupportedSummaryMetricClaims: string[];
  unsupportedExperienceMetricClaims: string[];
  unsupportedScopeClaims: string[];
  unsupportedNonNumericAssertions: string[];
}

interface BuildQualityReportInput {
  schemaValid: boolean;
  validationErrors: string[];
  regenerationAttempts?: number;
  factualAlignmentScore?: number;
}

const DEFAULT_RESUME_V2_FLAGS: ResumeV2Flags = {
  resume_v2_intake: true,
  resume_v2_writer: true,
  resume_v2_templates: false,
  resume_v2_strict_validation: true,
  resume_v2_creative_polish: false,
};

const SUMMARY_CLAIM_PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?%/g,
  /\$\s?\d+(?:,\d{3})*(?:\.\d+)?(?:\s?[kKmMbB])?\b/g,
  /\b\d+(?:\+)?\s*(?:years?|yrs?|months?)\b/gi,
  /(?<!\$)\b\d+(?:,\d{3})+\b/g,
];

const SCOPE_CLAIM_PATTERN =
  /\b(led|managed|owned|oversaw|directed|spearheaded|headed|architected|launched|scaled|delivered|implemented|optimized|improved|increased|reduced)\b/i;

const NON_NUMERIC_ASSERTION_PATTERN =
  /\b(expert|expertise|proficient|specialized|specialised|experienced|trusted|recognized|recognised|top[-\s]?performer|subject matter expert|certified)\b/i;

const NUMERIC_TOKEN_PATTERN =
  /\$?\d+(?:,\d{3})*(?:\.\d+)?%?(?:\+)?(?:\s?[kKmMbB])?/g;

const TOKEN_PATTERN = /[a-z0-9+#.-]+/g;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
  "while",
  "across",
  "over",
  "under",
  "through",
  "using",
  "built",
  "build",
  "work",
  "worked",
  "team",
  "teams",
]);

interface ClaimCandidate {
  text: string;
  kind:
    | "summary_metric"
    | "experience_metric"
    | "scope"
    | "non_numeric_assertion";
}

interface EvidenceDocument {
  raw: string;
  normalized: string;
  tokens: Set<string>;
  numericTokens: Set<string>;
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9+#.%\-$\s]/g, " ")
    .replace(/[,\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummaryClaims(summary: string): string[] {
  const claims = SUMMARY_CLAIM_PATTERNS.flatMap((pattern) =>
    Array.from(summary.matchAll(pattern), (match) => match[0]?.trim() || ""),
  ).filter((claim) => claim.length > 0);

  return [...new Set(claims)];
}

function normalizeNumericToken(value: string): string {
  return value.toLowerCase().replace(/[\s,]+/g, "");
}

function extractNumericTokens(text: string): string[] {
  const rawTokens = Array.from(text.matchAll(NUMERIC_TOKEN_PATTERN), (match) =>
    (match[0] || "").trim(),
  ).filter((token) => token.length > 0);
  return [...new Set(rawTokens.map((token) => normalizeNumericToken(token)))];
}

function extractContentTokens(text: string): string[] {
  const tokens = (normalizeForComparison(text).match(TOKEN_PATTERN) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 3 || token === "go" || token === "ai")
    .filter((token) => !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 12);
}

function classifyClaimText(
  text: string,
  metricKind: "summary_metric" | "experience_metric",
): ClaimCandidate | null {
  const hasNumericClaim =
    extractSummaryClaims(text).length > 0 || extractNumericTokens(text).length > 0;
  if (hasNumericClaim) {
    return { text, kind: metricKind };
  }

  if (SCOPE_CLAIM_PATTERN.test(text)) {
    return { text, kind: "scope" };
  }

  if (NON_NUMERIC_ASSERTION_PATTERN.test(text)) {
    return { text, kind: "non_numeric_assertion" };
  }

  return null;
}

function collectClaimCandidates(resumeData: Record<string, unknown>): ClaimCandidate[] {
  const candidates: ClaimCandidate[] = [];

  const summary =
    typeof resumeData.summary === "string" ? resumeData.summary.trim() : "";
  for (const sentence of splitSentences(summary)) {
    const claim = classifyClaimText(sentence, "summary_metric");
    if (claim) {
      candidates.push(claim);
    }
  }

  const experienceEntries = Array.isArray(resumeData.experience)
    ? resumeData.experience
    : [];

  for (const entry of experienceEntries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const experience = entry as Record<string, unknown>;
    const description =
      typeof experience.description === "string" ? experience.description.trim() : "";

    for (const sentence of splitSentences(description)) {
      const claim = classifyClaimText(sentence, "experience_metric");
      if (claim) {
        candidates.push(claim);
      }
    }

    if (Array.isArray(experience.achievements)) {
      for (const achievement of experience.achievements) {
        if (typeof achievement !== "string") {
          continue;
        }

        const normalizedAchievement = achievement.trim();
        if (normalizedAchievement.length < 12) {
          continue;
        }

        const claim = classifyClaimText(normalizedAchievement, "experience_metric");
        if (claim) {
          candidates.push(claim);
        }
      }
    }
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}:${normalizeForComparison(candidate.text)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildEvidenceDocuments(allMessages: EvidenceMessage[]): EvidenceDocument[] {
  return allMessages
    .filter((entry) => entry.isUser)
    .map((entry) => entry.content.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => ({
      raw: entry,
      normalized: normalizeForComparison(entry),
      tokens: new Set(extractContentTokens(entry)),
      numericTokens: new Set(extractNumericTokens(entry)),
    }));
}

function countTokenOverlap(tokens: string[], evidenceTokens: Set<string>): number {
  let overlap = 0;
  for (const token of tokens) {
    if (evidenceTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap;
}

function isClaimSupported(
  claim: ClaimCandidate,
  evidenceDocs: EvidenceDocument[],
): boolean {
  const normalizedClaim = normalizeForComparison(claim.text);
  if (
    normalizedClaim.length >= 20 &&
    evidenceDocs.some((doc) => doc.normalized.includes(normalizedClaim))
  ) {
    return true;
  }

  const claimNumericTokens = extractNumericTokens(claim.text);
  if (claimNumericTokens.length > 0) {
    const hasNumericSupport = claimNumericTokens.every((token) =>
      evidenceDocs.some((doc) => doc.numericTokens.has(token)),
    );

    if (!hasNumericSupport) {
      return false;
    }
  }

  const claimTokens = extractContentTokens(claim.text);
  if (claimTokens.length === 0) {
    return claimNumericTokens.length > 0;
  }

  const requiredOverlap =
    claim.kind === "scope" || claim.kind === "non_numeric_assertion"
      ? Math.min(2, claimTokens.length)
      : Math.min(3, Math.max(1, Math.ceil(claimTokens.length * 0.5)));

  return evidenceDocs.some((doc) => {
    const overlap = countTokenOverlap(claimTokens, doc.tokens);
    return overlap >= requiredOverlap;
  });
}

function emptyFactualResult(): FactualAlignmentResult {
  return {
    score: 1,
    errors: [],
    evaluatedClaims: [],
    supportedClaims: [],
    unsupportedClaims: [],
    unsupportedSummaryMetricClaims: [],
    unsupportedExperienceMetricClaims: [],
    unsupportedScopeClaims: [],
    unsupportedNonNumericAssertions: [],
  };
}

function toErrorMessage(label: string, claims: string[]): string | null {
  if (claims.length === 0) {
    return null;
  }

  return `${label}: ${claims.slice(0, 3).join(", ")}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isValidSkillEntry(value: unknown): boolean {
  if (isNonEmptyString(value)) {
    return true;
  }

  const skill = asRecord(value);
  return !!(skill && isNonEmptyString(skill.name));
}

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
      experience.forEach((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          errors.push(`Experience entry at index ${index} must be an object`);
          return;
        }

        const company = isNonEmptyString(record.company);
        const title = isNonEmptyString(record.title) || isNonEmptyString(record.role);
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

export async function evaluateResumeV2Flags(): Promise<ResumeV2Flags> {
  try {
    const [
      resume_v2_intake,
      resume_v2_writer,
      resume_v2_templates,
      resume_v2_strict_validation,
      resume_v2_creative_polish,
    ] =
      await Promise.all([
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
): string {
  return [
    "Repair the resume JSON so it passes validation.",
    "Return strict JSON only, with no markdown or explanation.",
    "Do not fabricate facts or metrics.",
    `Validation errors: ${validationErrors.join("; ")}`,
    "Current candidate data:",
    JSON.stringify(currentData),
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
      evidenceMap[field] = sourceMatches.length > 0 ? sourceMatches.slice(0, 3) : [value];
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

      evidenceMap[field] = (matches.length > 0 ? matches : rawStrings).slice(0, 3);
    }
  }

  if (!evidenceMap.rawUserInput && userMessages.length > 0) {
    evidenceMap.rawUserInput = userMessages.slice(0, 5);
  }

  return evidenceMap;
}
