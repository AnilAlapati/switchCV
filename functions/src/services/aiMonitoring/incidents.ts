import type {
  AIFailureEventDoc,
  AIIncident,
  AggregationWindowData,
} from "./types";

function summarizeRequestIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].slice(0, 5);
}

function percentage(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((part / total) * 10000) / 100;
}

export function detectActiveIncidents(
  data: AggregationWindowData,
): AIIncident[] {
  const incidents: AIIncident[] = [];
  const total15mRequests = data.summaries15m.length;
  const failed15m = data.summaries15m.filter(
    (summary) => summary.status === "failed",
  );
  const degraded15m = data.summaries15m.filter(
    (summary) => summary.status === "degraded",
  );
  const userVisibleFailures15m = data.summaries15m.filter(
    (summary) => summary.userVisibleFailure,
  );

  for (const failureCode of ["AI_SECRET_MISSING", "AI_PROVIDER_NOT_CONFIGURED"]) {
    const matchingEvents = data.failures15m.filter(
      (event) => event.failureCode === failureCode,
    );

    if (matchingEvents.length === 0) {
      continue;
    }

    incidents.push({
      key: failureCode,
      severity: "critical",
      title: `${failureCode} detected`,
      summary: `${matchingEvents.length} ${failureCode} event(s) in the last 15 minutes`,
      requestIds: summarizeRequestIds(
        matchingEvents.map((event) => event.requestId),
      ),
      details: {
        count: matchingEvents.length,
        failureCode,
      },
    });
  }

  const allModelsFailedEvents = data.failures15m.filter(
    (event) => event.failureCode === "AI_ALL_MODELS_FAILED",
  );
  if (allModelsFailedEvents.length >= 3) {
    incidents.push({
      key: "AI_ALL_MODELS_FAILED_SPIKE",
      severity: "critical",
      title: "AI all-model failure spike",
      summary: `${allModelsFailedEvents.length} all-model failures in the last 15 minutes`,
      requestIds: summarizeRequestIds(
        allModelsFailedEvents.map((event) => event.requestId),
      ),
      details: {
        count: allModelsFailedEvents.length,
        windowMinutes: 15,
      },
    });
  }

  const failedRate15m = percentage(failed15m.length, total15mRequests);
  if (total15mRequests >= 5 && failedRate15m > 10) {
    incidents.push({
      key: "FAILED_REQUEST_RATE_15M",
      severity: "critical",
      title: "Failed request rate above threshold",
      summary: `${failedRate15m}% failed requests over the last 15 minutes`,
      requestIds: summarizeRequestIds(failed15m.map((summary) => summary.requestId)),
      details: {
        failedRequests: failed15m.length,
        totalRequests: total15mRequests,
        failureRate: failedRate15m,
      },
    });
  }

  const userVisibleFailureRate15m = percentage(
    userVisibleFailures15m.length,
    total15mRequests,
  );
  if (total15mRequests >= 5 && userVisibleFailureRate15m > 10) {
    incidents.push({
      key: "USER_VISIBLE_FAILURE_RATE_15M",
      severity: "critical",
      title: "User-visible AI failures above threshold",
      summary: `${userVisibleFailureRate15m}% user-visible failures in the last 15 minutes`,
      requestIds: summarizeRequestIds(
        userVisibleFailures15m.map((summary) => summary.requestId),
      ),
      details: {
        failures: userVisibleFailures15m.length,
        totalRequests: total15mRequests,
        failureRate: userVisibleFailureRate15m,
      },
    });
  }

  const degradedRate15m = percentage(degraded15m.length, total15mRequests);
  if (total15mRequests >= 5 && degradedRate15m > 20) {
    incidents.push({
      key: "DEGRADED_REQUEST_RATE_15M",
      severity: "warning",
      title: "Degraded request rate above threshold",
      summary: `${degradedRate15m}% degraded requests in the last 15 minutes`,
      requestIds: summarizeRequestIds(
        degraded15m.map((summary) => summary.requestId),
      ),
      details: {
        degradedRequests: degraded15m.length,
        totalRequests: total15mRequests,
        degradedRate: degradedRate15m,
      },
    });
  }

  const totalFailureEvents15m = data.failures15m.length;
  const failureEventRate15m = percentage(totalFailureEvents15m, total15mRequests);
  if (totalFailureEvents15m >= 5 && failureEventRate15m > 20) {
    incidents.push({
      key: "AI_FAILURE_EVENT_SPIKE_15M",
      severity: "warning",
      title: "AI failure events spiking",
      summary: `${totalFailureEvents15m} failure events with ${failureEventRate15m}% event/request ratio in 15 minutes`,
      requestIds: summarizeRequestIds(
        data.failures15m.map((event) => event.requestId),
      ),
      details: {
        failureEvents: totalFailureEvents15m,
        totalRequests: total15mRequests,
        failureRate: failureEventRate15m,
      },
    });
  }

  const nonJsonByModel = new Map<string, AIFailureEventDoc[]>();
  const schemaByModel = new Map<string, AIFailureEventDoc[]>();
  const timeoutsByProvider = new Map<string, AIFailureEventDoc[]>();

  for (const event of data.failures15m) {
    if (event.failureCode === "AI_NON_JSON_RESPONSE" && event.model) {
      const current = nonJsonByModel.get(event.model) ?? [];
      current.push(event);
      nonJsonByModel.set(event.model, current);
    }

    if (event.failureCode === "AI_SCHEMA_VALIDATION_FAILED" && event.model) {
      const current = schemaByModel.get(event.model) ?? [];
      current.push(event);
      schemaByModel.set(event.model, current);
    }

    if (event.failureCode === "AI_TIMEOUT" && event.provider) {
      const current = timeoutsByProvider.get(event.provider) ?? [];
      current.push(event);
      timeoutsByProvider.set(event.provider, current);
    }
  }

  for (const [model, events] of nonJsonByModel.entries()) {
    if (events.length < 3) {
      continue;
    }

    incidents.push({
      key: `NON_JSON_MODEL_${model}`,
      severity: "warning",
      title: `Non-JSON responses spiking for ${model}`,
      summary: `${events.length} non-JSON responses for ${model} in the last 15 minutes`,
      requestIds: summarizeRequestIds(events.map((event) => event.requestId)),
      details: {
        count: events.length,
        model,
      },
    });
  }

  for (const [model, events] of schemaByModel.entries()) {
    if (events.length < 3) {
      continue;
    }

    incidents.push({
      key: `SCHEMA_MODEL_${model}`,
      severity: "warning",
      title: `Schema validation failures spiking for ${model}`,
      summary: `${events.length} schema validation failures for ${model} in the last 15 minutes`,
      requestIds: summarizeRequestIds(events.map((event) => event.requestId)),
      details: {
        count: events.length,
        model,
      },
    });
  }

  for (const [provider, events] of timeoutsByProvider.entries()) {
    if (events.length < 3) {
      continue;
    }

    incidents.push({
      key: `TIMEOUT_PROVIDER_${provider}`,
      severity: "warning",
      title: `Timeouts spiking for ${provider}`,
      summary: `${events.length} timeout events for ${provider} in the last 15 minutes`,
      requestIds: summarizeRequestIds(events.map((event) => event.requestId)),
      details: {
        count: events.length,
        provider,
      },
    });
  }

  const total60mRequests = data.summaries60m.length;
  const degraded60m = data.summaries60m.filter(
    (summary) => summary.status === "degraded",
  );
  const failed60m = data.summaries60m.filter(
    (summary) => summary.status === "failed",
  );
  const fallbackRecovered60m = data.summaries60m.filter(
    (summary) => summary.fallbackCount > 0,
  );
  const degradedRate60m = percentage(degraded60m.length, total60mRequests);
  const failedRate60m = percentage(failed60m.length, total60mRequests);
  const fallbackRecoveredRate60m = percentage(
    fallbackRecovered60m.length,
    total60mRequests,
  );

  if (total60mRequests >= 10 && degradedRate60m > 15) {
    incidents.push({
      key: "DEGRADED_REQUEST_RATE_60M",
      severity: "warning",
      title: "Sustained degraded request rate",
      summary: `${degradedRate60m}% degraded requests in the last 60 minutes`,
      requestIds: summarizeRequestIds(
        degraded60m.map((summary) => summary.requestId),
      ),
      details: {
        degradedRequests: degraded60m.length,
        totalRequests: total60mRequests,
        degradedRate: degradedRate60m,
      },
    });
  }

  if (total60mRequests >= 10 && failedRate60m > 5) {
    incidents.push({
      key: "FAILED_REQUEST_RATE_60M",
      severity: "critical",
      title: "Sustained failed request rate",
      summary: `${failedRate60m}% failed requests in the last 60 minutes`,
      requestIds: summarizeRequestIds(failed60m.map((summary) => summary.requestId)),
      details: {
        failedRequests: failed60m.length,
        totalRequests: total60mRequests,
        failedRate: failedRate60m,
      },
    });
  }

  if (total60mRequests >= 10 && fallbackRecoveredRate60m > 25) {
    incidents.push({
      key: "FALLBACK_RECOVERY_RATE_60M",
      severity: "warning",
      title: "Fallback recovery rate elevated",
      summary: `${fallbackRecoveredRate60m}% of requests required fallback recovery in the last 60 minutes`,
      requestIds: summarizeRequestIds(
        fallbackRecovered60m.map((summary) => summary.requestId),
      ),
      details: {
        fallbackRecoveredRequests: fallbackRecovered60m.length,
        totalRequests: total60mRequests,
        fallbackRecoveredRate: fallbackRecoveredRate60m,
      },
    });
  }

  return incidents;
}
