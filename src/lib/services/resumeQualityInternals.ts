/**
 * Internal helpers for resumeGenerationQuality.ts
 *
 * Contains all private types, constants, and utility functions used by the
 * quality-evaluation exported functions. Extracted to keep the public API
 * surface of resumeGenerationQuality.ts focused and under the max-lines limit.
 */

// ============= Shared exported interfaces (re-exported from quality) =============

export interface ResumeV2Flags {
  resume_v2_intake: boolean;
  resume_v2_writer: boolean;
  resume_v2_templates: boolean;
  resume_v2_strict_validation: boolean;
  resume_v2_creative_polish: boolean;
  resume_v2_llm_enhancement: boolean;
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

// ============= Private interfaces =============

export interface BuildQualityReportInput {
  schemaValid: boolean;
  validationErrors: string[];
  regenerationAttempts?: number;
  factualAlignmentScore?: number;
}

export interface IndexedValidationIssue {
  section: "experience" | "education";
  index: number;
  kind: "company" | "title" | "description" | "institution" | "degree";
}

export interface ClaimCandidate {
  text: string;
  kind:
    | "summary_metric"
    | "experience_metric"
    | "scope"
    | "non_numeric_assertion";
}

export interface EvidenceDocument {
  raw: string;
  normalized: string;
  tokens: Set<string>;
  numericTokens: Set<string>;
}

// ============= Constants =============

export const DEFAULT_RESUME_V2_FLAGS: ResumeV2Flags = {
  resume_v2_intake: true,
  resume_v2_writer: true,
  resume_v2_templates: false,
  resume_v2_strict_validation: true,
  resume_v2_creative_polish: false,
  resume_v2_llm_enhancement: true,
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

// ============= Pure utility helpers =============

export function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9+#.%\-$\s]/g, " ")
    .replace(/[,\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSummaryClaims(summary: string): string[] {
  const claims = SUMMARY_CLAIM_PATTERNS.flatMap((pattern) =>
    Array.from(summary.matchAll(pattern), (match) => match[0]?.trim() || ""),
  ).filter((claim) => claim.length > 0);
  return [...new Set(claims)];
}

function normalizeNumericToken(value: string): string {
  return value.toLowerCase().replace(/[\s,]+/g, "");
}

export function extractNumericTokens(text: string): string[] {
  const rawTokens = Array.from(text.matchAll(NUMERIC_TOKEN_PATTERN), (match) =>
    (match[0] || "").trim(),
  ).filter((token) => token.length > 0);
  return [...new Set(rawTokens.map((token) => normalizeNumericToken(token)))];
}

export function extractContentTokens(text: string): string[] {
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
    extractSummaryClaims(text).length > 0 ||
    extractNumericTokens(text).length > 0;
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

export function collectClaimCandidates(
  resumeData: Record<string, unknown>,
): ClaimCandidate[] {
  const candidates: ClaimCandidate[] = [];
  const summary =
    typeof resumeData.summary === "string" ? resumeData.summary.trim() : "";
  for (const sentence of splitSentences(summary)) {
    const claim = classifyClaimText(sentence, "summary_metric");
    if (claim) candidates.push(claim);
  }
  const experienceEntries = Array.isArray(resumeData.experience)
    ? resumeData.experience
    : [];
  for (const entry of experienceEntries) {
    if (!entry || typeof entry !== "object") continue;
    const experience = entry as Record<string, unknown>;
    const description =
      typeof experience.description === "string"
        ? experience.description.trim()
        : "";
    for (const sentence of splitSentences(description)) {
      const claim = classifyClaimText(sentence, "experience_metric");
      if (claim) candidates.push(claim);
    }
    if (Array.isArray(experience.achievements)) {
      for (const achievement of experience.achievements) {
        if (typeof achievement !== "string") continue;
        const normalizedAchievement = achievement.trim();
        if (normalizedAchievement.length < 12) continue;
        const claim = classifyClaimText(
          normalizedAchievement,
          "experience_metric",
        );
        if (claim) candidates.push(claim);
      }
    }
  }
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}:${normalizeForComparison(candidate.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildEvidenceDocuments(
  allMessages: EvidenceMessage[],
): EvidenceDocument[] {
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

function countTokenOverlap(
  tokens: string[],
  evidenceTokens: Set<string>,
): number {
  let overlap = 0;
  for (const token of tokens) {
    if (evidenceTokens.has(token)) overlap += 1;
  }
  return overlap;
}

export function isClaimSupported(
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
    if (!hasNumericSupport) return false;
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

export function emptyFactualResult(): FactualAlignmentResult {
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

export function toErrorMessage(label: string, claims: string[]): string | null {
  if (claims.length === 0) return null;
  return `${label}: ${claims.slice(0, 3).join(", ")}`;
}

// Placeholder strings that an LLM may write when it doesn't know the value.
// These must be treated as "empty" by validation logic.
const PLACEHOLDER_VALUES = new Set([
  "missing",
  "n/a",
  "na",
  "unknown",
  "tbd",
  "todo",
  "placeholder",
  "none",
  "[unknown]",
  "[missing]",
  "[n/a]",
]);

export function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !PLACEHOLDER_VALUES.has(value.trim().toLowerCase())
  );
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isValidSkillEntry(value: unknown): boolean {
  if (isNonEmptyString(value)) return true;
  const skill = asRecord(value);
  return !!(skill && isNonEmptyString(skill.name));
}

export function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function buildExperienceDatePreview(
  entry: Record<string, unknown>,
): string | null {
  const duration = firstNonEmptyString(entry.duration);
  if (duration) return duration;
  const startDate = firstNonEmptyString(entry.startDate);
  const endDate = firstNonEmptyString(entry.endDate);
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate;
}

export function summarizeExperienceEntry(
  entry: Record<string, unknown> | null,
): string {
  if (!entry) {
    return "I do not have any structured details for that experience entry yet.";
  }
  const role = firstNonEmptyString(entry.role, entry.title) || "missing";
  const company = firstNonEmptyString(entry.company) || "missing";
  const dates = buildExperienceDatePreview(entry);
  const hasDescription = isNonEmptyString(entry.description);
  const achievements = Array.isArray(entry.achievements)
    ? entry.achievements.filter((achievement) => isNonEmptyString(achievement))
        .length
    : 0;
  const parts = [`title/role="${role}"`, `company="${company}"`];
  if (dates) parts.push(`dates="${dates}"`);
  parts.push(`description=${hasDescription ? "present" : "missing"}`);
  parts.push(`achievements=${achievements}`);
  return `Current details: ${parts.join(", ")}.`;
}

export function summarizeEducationEntry(
  entry: Record<string, unknown> | null,
): string {
  if (!entry) {
    return "I do not have any structured details for that education entry yet.";
  }
  const institution = firstNonEmptyString(entry.institution) || "missing";
  const degree = firstNonEmptyString(entry.degree) || "missing";
  const year = firstNonEmptyString(entry.year, entry.endDate, entry.startDate);
  const parts = [`institution="${institution}"`, `degree="${degree}"`];
  if (year) parts.push(`year/date="${year}"`);
  return `Current details: ${parts.join(", ")}.`;
}

export function parseIndexedValidationIssue(
  error: string,
): IndexedValidationIssue | null {
  let match = error.match(/^Experience entry (\d+) is missing company$/);
  if (match?.[1]) {
    return {
      section: "experience",
      index: Number.parseInt(match[1], 10) - 1,
      kind: "company",
    };
  }
  match = error.match(/^Experience entry (\d+) is missing title\/role$/);
  if (match?.[1]) {
    return {
      section: "experience",
      index: Number.parseInt(match[1], 10) - 1,
      kind: "title",
    };
  }
  match = error.match(
    /^Experience entry (\d+) must include description or achievements$/,
  );
  if (match?.[1]) {
    return {
      section: "experience",
      index: Number.parseInt(match[1], 10) - 1,
      kind: "description",
    };
  }
  match = error.match(/^Education entry (\d+) is missing institution$/);
  if (match?.[1]) {
    return {
      section: "education",
      index: Number.parseInt(match[1], 10) - 1,
      kind: "institution",
    };
  }
  match = error.match(/^Education entry (\d+) is missing degree$/);
  if (match?.[1]) {
    return {
      section: "education",
      index: Number.parseInt(match[1], 10) - 1,
      kind: "degree",
    };
  }
  return null;
}

export function buildValidationChecklistItem(
  issue: IndexedValidationIssue,
  resumeData: Record<string, unknown>,
): string {
  const experienceEntries = Array.isArray(resumeData.experience)
    ? resumeData.experience
    : [];
  if (issue.section === "experience") {
    const entry = asRecord(experienceEntries[issue.index]);
    const label = `Experience entry ${issue.index + 1}`;
    const role = firstNonEmptyString(entry?.role, entry?.title);
    if (issue.kind === "company") {
      return role
        ? `${label}: add the company name for ${role}.`
        : `${label}: add the company name.`;
    }
    if (issue.kind === "title") return `${label}: add the job title or role.`;
    return `${label}: add a short description of what you did, or at least one achievement.`;
  }
  const label = `Education entry ${issue.index + 1}`;
  if (issue.kind === "institution")
    return `${label}: add the school or institution name.`;
  return `${label}: add the degree or qualification name.`;
}
