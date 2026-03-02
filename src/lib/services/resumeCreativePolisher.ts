export type CreativeStyle = "professional" | "executive" | "innovator";

export interface CreativePolishAnnotation {
  section: "summary" | "experience.description" | "experience.achievements";
  path: string;
  original: string;
  polished: string;
  confidence: number;
  applied: boolean;
  reason?: string;
}

export interface CreativePolishResult {
  polishedData: Record<string, unknown>;
  annotations: CreativePolishAnnotation[];
  appliedCount: number;
  revertedCount: number;
}

const TOKEN_PATTERN = /[a-z0-9+#.-]+/g;
const NUMERIC_PATTERN = /\$?\d+(?:,\d{3})*(?:\.\d+)?%?(?:\+)?(?:\s?[kKmMbB])?/g;

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
  "in",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
  "we",
  "i",
  "our",
  "my",
]);

const BASE_REWRITES: Array<[RegExp, string]> = [
  [/^\s*(?:i|we)\s+/i, ""],
  [/\bmy team and i\b/gi, "we"],
  [/\bi\s+was\s+responsible\s+for\b/gi, "led"],
  [/\bwe\s+were\s+responsible\s+for\b/gi, "led"],
  [/\bresponsible for\b/gi, "led"],
  [/\b(?:was|were)\s+led\b/gi, "led"],
  [/\bworked on\b/gi, "built"],
  [/\bhelped\b/gi, "contributed to"],
  [/\butilized\b/gi, "used"],
  [/\bin order to\b/gi, "to"],
];

const STYLE_REWRITES: Record<CreativeStyle, Array<[RegExp, string]>> = {
  professional: [
    [/\bvery\b/gi, ""],
    [/\breally\b/gi, ""],
  ],
  executive: [
    [/\bled\b/gi, "directed"],
    [/\bmanaged\b/gi, "orchestrated"],
    [/\bteam\b/gi, "organization"],
  ],
  innovator: [
    [/\bbuilt\b/gi, "engineered"],
    [/\bdeveloped\b/gi, "invented"],
    [/\bimproved\b/gi, "optimized"],
  ],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9+#.%\-$\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitStatements(text: string): string[] {
  const matches = text.match(/[^.!?\n]+[.!?]?/g);
  if (!matches) {
    const trimmed = text.trim();
    return trimmed ? [trimmed] : [];
  }

  return matches.map((entry) => normalizeWhitespace(entry)).filter(Boolean);
}

function sentenceCase(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractNumericTokens(text: string): Set<string> {
  const matches = Array.from(text.matchAll(NUMERIC_PATTERN), (match) =>
    (match[0] || "").toLowerCase().replace(/[\s,]+/g, ""),
  ).filter(Boolean);

  return new Set(matches);
}

function extractTokens(text: string): string[] {
  return (normalizeText(text).match(TOKEN_PATTERN) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => !STOP_WORDS.has(token));
}

/**
 * Known-good rewrite mappings that should receive a confidence boost.
 * These are standard resume-writing improvements that are always safe.
 */
const KNOWN_GOOD_REWRITES = new Map<string, string>([
  ["helped", "contributed to"],
  ["responsible for", "led"],
  ["worked on", "built"],
  ["utilized", "used"],
  ["in order to", "to"],
]);

function hasKnownGoodRewrite(original: string, polished: string): boolean {
  const origLower = original.toLowerCase();
  const polishedLower = polished.toLowerCase();
  for (const [from, to] of KNOWN_GOOD_REWRITES) {
    if (
      origLower.includes(from) &&
      !polishedLower.includes(from) &&
      polishedLower.includes(to)
    ) {
      return true;
    }
  }
  return false;
}

function scoreConfidence(original: string, polished: string): number {
  const originalTokens = extractTokens(original);
  const polishedTokens = extractTokens(polished);

  const originalNumeric = extractNumericTokens(original);
  const polishedNumeric = extractNumericTokens(polished);

  const numericMismatch =
    originalNumeric.size !== polishedNumeric.size ||
    Array.from(originalNumeric).some((token) => !polishedNumeric.has(token));
  if (numericMismatch) {
    return 0;
  }

  if (originalTokens.length === 0 && polishedTokens.length === 0) {
    return 1;
  }

  const polishedSet = new Set(polishedTokens);
  const overlap = originalTokens.filter((token) =>
    polishedSet.has(token),
  ).length;
  const overlapRatio = overlap / Math.max(1, originalTokens.length);
  const lengthRatio =
    Math.min(original.length, polished.length) /
    Math.max(1, Math.max(original.length, polished.length));

  let score = overlapRatio * 0.7 + lengthRatio * 0.3;

  // Boost confidence for known-good resume writing improvements
  if (hasKnownGoodRewrite(original, polished)) {
    score = Math.max(score, 0.75);
  }

  return Number(score.toFixed(2));
}

function applyRewrites(text: string, style: CreativeStyle): string {
  let polished = text;

  for (const [pattern, replacement] of BASE_REWRITES) {
    polished = polished.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of STYLE_REWRITES[style]) {
    polished = polished.replace(pattern, replacement);
  }

  polished = sentenceCase(polished);
  polished = polished.replace(/\s+([,.!?;:])/g, "$1");
  polished = polished.replace(/\s+/g, " ").trim();

  if (polished && !/[.!?]$/.test(polished)) {
    polished += ".";
  }

  return polished;
}

function polishStatements(
  input: string,
  section: CreativePolishAnnotation["section"],
  pathPrefix: string,
  style: CreativeStyle,
): { output: string; annotations: CreativePolishAnnotation[] } {
  const statements = splitStatements(input);
  const annotations: CreativePolishAnnotation[] = [];
  const polishedStatements: string[] = [];

  statements.forEach((statement, index) => {
    const polished = applyRewrites(statement, style);
    const confidence = scoreConfidence(statement, polished);
    const applied = confidence >= 0.65;

    annotations.push({
      section,
      path: `${pathPrefix}.${index}`,
      original: statement,
      polished: applied ? polished : statement,
      confidence,
      applied,
      reason: applied ? "accepted" : "low-confidence-reverted",
    });

    polishedStatements.push(applied ? polished : statement);
  });

  return {
    output: polishedStatements.join(" ").trim(),
    annotations,
  };
}

function cloneData(input: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

export function applyCreativePolish(
  resumeData: Record<string, unknown>,
  style: CreativeStyle = "professional",
): CreativePolishResult {
  const polishedData = cloneData(resumeData);
  const annotations: CreativePolishAnnotation[] = [];

  if (typeof polishedData.summary === "string" && polishedData.summary.trim()) {
    const summaryResult = polishStatements(
      polishedData.summary,
      "summary",
      "summary",
      style,
    );
    polishedData.summary = summaryResult.output;
    annotations.push(...summaryResult.annotations);
  }

  if (Array.isArray(polishedData.experience)) {
    polishedData.experience = polishedData.experience.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return entry;
      }

      const normalized = { ...(entry as Record<string, unknown>) };

      if (
        typeof normalized.description === "string" &&
        normalized.description.trim()
      ) {
        const descriptionResult = polishStatements(
          normalized.description,
          "experience.description",
          `experience.${index}.description`,
          style,
        );
        normalized.description = descriptionResult.output;
        annotations.push(...descriptionResult.annotations);
      }

      if (Array.isArray(normalized.achievements)) {
        normalized.achievements = normalized.achievements.map(
          (achievement, achIndex) => {
            if (typeof achievement !== "string" || !achievement.trim()) {
              return achievement;
            }

            const result = polishStatements(
              achievement,
              "experience.achievements",
              `experience.${index}.achievements.${achIndex}`,
              style,
            );
            annotations.push(...result.annotations);
            return result.output || achievement;
          },
        );
      }

      return normalized;
    });
  }

  const appliedCount = annotations.filter(
    (annotation) => annotation.applied,
  ).length;
  const revertedCount = annotations.length - appliedCount;

  return {
    polishedData,
    annotations,
    appliedCount,
    revertedCount,
  };
}
