import type {
  AIDailyMetricsDoc,
  AIFailureEventDoc,
  AIRequestSummaryDoc,
} from "./types";

function countBy<T extends string>(
  values: Array<T | undefined>,
): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    if (!value) {
      return accumulator;
    }

    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }

  const total = numbers.reduce((sum, value) => sum + value, 0);
  return Math.round((total / numbers.length) * 100) / 100;
}

export function buildDailyMetrics(
  summaries: AIRequestSummaryDoc[],
  failures: AIFailureEventDoc[],
  updatedAt: Date = new Date(),
): AIDailyMetricsDoc {
  const successfulRequests = summaries.filter(
    (summary) => summary.status === "success",
  ).length;
  const degradedRequests = summaries.filter(
    (summary) => summary.status === "degraded",
  ).length;
  const failedRequests = summaries.filter(
    (summary) => summary.status === "failed",
  ).length;
  const userVisibleFailures = summaries.filter(
    (summary) => summary.userVisibleFailure,
  ).length;
  const fallbackRecoveredRequests = summaries.filter(
    (summary) => summary.fallbackCount > 0,
  ).length;
  const avgLatencyByStage = {
    extraction: average(
      summaries
        .map((summary) => summary.stages?.extraction?.latencyMs)
        .filter((value): value is number => typeof value === "number"),
    ),
    generation: average(
      summaries
        .map((summary) => summary.stages?.generation?.latencyMs)
        .filter((value): value is number => typeof value === "number"),
    ),
    repair: average(
      summaries
        .map((summary) => summary.stages?.repair?.latencyMs)
        .filter((value): value is number => typeof value === "number"),
    ),
  };

  return {
    totalRequests: summaries.length,
    successfulRequests,
    degradedRequests,
    failedRequests,
    userVisibleFailures,
    fallbackRecoveredRequests,
    extractionFailures: failures.filter((event) => event.stage === "extraction")
      .length,
    generationFailures: failures.filter((event) => event.stage === "generation")
      .length,
    repairFailures: failures.filter((event) => event.stage === "repair").length,
    failureCountsByCode: countBy(failures.map((event) => event.failureCode)),
    failureCountsByProvider: countBy(failures.map((event) => event.provider)),
    failureCountsByModel: countBy(failures.map((event) => event.model)),
    avgLatencyByStage,
    updatedAt,
  };
}
