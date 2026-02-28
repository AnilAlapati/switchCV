import {
  evaluateFactualAlignment,
  validateStructuredResumeContract,
  type EvidenceMessage,
} from "@/lib/services/resumeGenerationQuality";

export interface LaunchEvaluationCase {
  id: string;
  resumeData: Record<string, unknown>;
  evidenceMessages: EvidenceMessage[];
  parseSucceeded?: boolean;
  reviewerScore?: number;
  regenerationAttempts?: number;
  userEdited?: boolean;
}

export interface CreativePolishEvaluationCase {
  id: string;
  factualResume: Record<string, unknown>;
  polishedResume: Record<string, unknown>;
  evidenceMessages: EvidenceMessage[];
  reviewerScore?: number;
  fabricatedClaimsCount?: number;
  baselineRegenerationAttempts?: number;
  polishedRegenerationAttempts?: number;
}

export interface LaunchGateSummary {
  totalCases: number;
  parseSuccessRate: number;
  schemaValidRate: number;
  factualAlignmentScore: number;
  reviewerScore: number;
  avgRegenerationAttempts: number;
  userManualEditRate: number;
  passed: boolean;
  failures: string[];
}

export interface CreativePolishGateSummary {
  totalCases: number;
  reviewerScore: number;
  fabricatedOrUnsupportedClaims: number;
  avgBaselineRegenerationAttempts: number;
  avgPolishedRegenerationAttempts: number;
  passed: boolean;
  failures: string[];
}

function roundTo(value: number, digits: number = 2): number {
  return Number(value.toFixed(digits));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evaluateLaunchGate(
  cases: LaunchEvaluationCase[],
): LaunchGateSummary {
  const totalCases = cases.length;
  if (totalCases === 0) {
    return {
      totalCases: 0,
      parseSuccessRate: 0,
      schemaValidRate: 0,
      factualAlignmentScore: 0,
      reviewerScore: 0,
      avgRegenerationAttempts: 0,
      userManualEditRate: 0,
      passed: false,
      failures: ["Dataset is empty"],
    };
  }

  let parseSuccessCount = 0;
  let schemaValidCount = 0;
  let userEditedCount = 0;

  const factualScores: number[] = [];
  const reviewerScores: number[] = [];
  const regenerationAttempts: number[] = [];

  for (const entry of cases) {
    if (entry.parseSucceeded !== false) {
      parseSuccessCount += 1;
    }

    const contractErrors = validateStructuredResumeContract(entry.resumeData, {
      strictMode: true,
    });
    if (contractErrors.length === 0) {
      schemaValidCount += 1;
    }

    const factual = evaluateFactualAlignment(entry.resumeData, entry.evidenceMessages);
    factualScores.push(factual.score * 100);

    if (typeof entry.reviewerScore === "number") {
      reviewerScores.push(entry.reviewerScore);
    }

    regenerationAttempts.push(entry.regenerationAttempts ?? 0);
    if (entry.userEdited) {
      userEditedCount += 1;
    }
  }

  const parseSuccessRate = roundTo((parseSuccessCount / totalCases) * 100);
  const schemaValidRate = roundTo((schemaValidCount / totalCases) * 100);
  const factualAlignmentScore = roundTo(average(factualScores));
  const reviewerScore = roundTo(average(reviewerScores), 3);
  const avgRegenerationAttempts = roundTo(average(regenerationAttempts), 3);
  const userManualEditRate = roundTo((userEditedCount / totalCases) * 100);

  const failures: string[] = [];
  if (parseSuccessRate < 95) {
    failures.push(`parse_success_rate ${parseSuccessRate}% < 95%`);
  }
  if (schemaValidRate < 95) {
    failures.push(`schema_valid_rate ${schemaValidRate}% < 95%`);
  }
  if (factualAlignmentScore < 90) {
    failures.push(`factual_alignment_score ${factualAlignmentScore}% < 90%`);
  }
  if (reviewerScores.length === 0) {
    failures.push("No reviewer scores found; reviewer gate cannot be evaluated");
  } else if (reviewerScore < 4.5) {
    failures.push(`reviewer_score ${reviewerScore} < 4.5`);
  }

  return {
    totalCases,
    parseSuccessRate,
    schemaValidRate,
    factualAlignmentScore,
    reviewerScore,
    avgRegenerationAttempts,
    userManualEditRate,
    passed: failures.length === 0,
    failures,
  };
}

export function evaluateCreativePolishGate(
  cases: CreativePolishEvaluationCase[],
): CreativePolishGateSummary {
  const totalCases = cases.length;
  if (totalCases === 0) {
    return {
      totalCases: 0,
      reviewerScore: 0,
      fabricatedOrUnsupportedClaims: 0,
      avgBaselineRegenerationAttempts: 0,
      avgPolishedRegenerationAttempts: 0,
      passed: false,
      failures: ["Dataset is empty"],
    };
  }

  const reviewerScores: number[] = [];
  const baselineAttempts: number[] = [];
  const polishedAttempts: number[] = [];

  let fabricatedOrUnsupportedClaims = 0;

  for (const entry of cases) {
    if (typeof entry.reviewerScore === "number") {
      reviewerScores.push(entry.reviewerScore);
    }

    baselineAttempts.push(entry.baselineRegenerationAttempts ?? 0);
    polishedAttempts.push(entry.polishedRegenerationAttempts ?? 0);

    const factual = evaluateFactualAlignment(
      entry.polishedResume,
      entry.evidenceMessages,
    );
    fabricatedOrUnsupportedClaims +=
      factual.unsupportedClaims.length + (entry.fabricatedClaimsCount ?? 0);
  }

  const reviewerScore = roundTo(average(reviewerScores), 3);
  const avgBaselineRegenerationAttempts = roundTo(average(baselineAttempts), 3);
  const avgPolishedRegenerationAttempts = roundTo(average(polishedAttempts), 3);

  const failures: string[] = [];
  if (totalCases < 50) {
    failures.push(`Only ${totalCases} cases found; minimum 50 required`);
  }
  if (reviewerScores.length === 0) {
    failures.push("No reviewer scores found; reviewer gate cannot be evaluated");
  } else if (reviewerScore < 4.5) {
    failures.push(`reviewer_score ${reviewerScore} < 4.5`);
  }
  if (fabricatedOrUnsupportedClaims > 0) {
    failures.push(
      `Found ${fabricatedOrUnsupportedClaims} fabricated or unsupported claims`,
    );
  }
  if (avgPolishedRegenerationAttempts > avgBaselineRegenerationAttempts) {
    failures.push(
      `avg_regeneration_attempts increased (${avgBaselineRegenerationAttempts} -> ${avgPolishedRegenerationAttempts})`,
    );
  }

  return {
    totalCases,
    reviewerScore,
    fabricatedOrUnsupportedClaims,
    avgBaselineRegenerationAttempts,
    avgPolishedRegenerationAttempts,
    passed: failures.length === 0,
    failures,
  };
}

