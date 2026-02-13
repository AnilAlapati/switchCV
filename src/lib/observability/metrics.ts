import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

type MetricAttributes = Record<string, string | number | boolean>;
type MetricUnit =
  | "none"
  | "nanosecond"
  | "microsecond"
  | "millisecond"
  | "second"
  | "byte"
  | "bit"
  | "percent";

/**
 * Standardized metrics helper that sends data to Sentry Metrics
 * and logs structured JSON for other aggregators (e.g., Cloud Logging)
 *
 * Uses Sentry SDK v10 API:
 *   - Sentry.metrics.count(name, value, { attributes, unit })
 *   - Sentry.metrics.distribution(name, value, { attributes, unit })
 *   - Sentry.metrics.gauge(name, value, { attributes, unit })
 */
export const metrics = {
  /**
   * Increment a counter metric
   */
  increment: (
    name: string,
    value: number = 1,
    attributes: MetricAttributes = {},
  ) => {
    try {
      Sentry.metrics.count(name, value, { attributes });
    } catch {
      // Sentry metrics might fail if not initialized or in some edge contexts
    }

    // Also log for structured logging / debugging
    logger.debug(
      { metric: name, type: "counter", value, attributes },
      `[Metric] ${name}`,
    );
  },

  /**
   * Record a distribution value (histogram)
   */
  distribution: (
    name: string,
    value: number,
    attributes: MetricAttributes = {},
    unit: MetricUnit = "none",
  ) => {
    try {
      Sentry.metrics.distribution(name, value, { attributes, unit });
    } catch {
      // Ignore
    }

    logger.debug(
      { metric: name, type: "distribution", value, attributes, unit },
      `[Metric] ${name}`,
    );
  },

  /**
   * Set a gauge value
   */
  gauge: (
    name: string,
    value: number,
    attributes: MetricAttributes = {},
    unit: MetricUnit = "none",
  ) => {
    try {
      Sentry.metrics.gauge(name, value, { attributes, unit });
    } catch {
      // Ignore
    }

    logger.debug(
      { metric: name, type: "gauge", value, attributes, unit },
      `[Metric] ${name}`,
    );
  },

  /**
   * Record specific business metrics
   */
  business: {
    /**
     * Track AI token usage
     */
    trackAiTokens: (
      provider: string,
      model: string,
      inputTokens: number,
      outputTokens: number,
    ) => {
      const tags = { provider, model };

      metrics.increment("ai.tokens.input", inputTokens, tags);
      metrics.increment("ai.tokens.output", outputTokens, tags);
      metrics.increment("ai.tokens.total", inputTokens + outputTokens, tags);

      // Cost estimation (approximate, for monitoring)
      // This is duplicative of billing service but good for observability
      logger.info(
        {
          metric: "ai_usage",
          provider,
          model,
          inputTokens,
          outputTokens,
        },
        "AI Token Usage",
      );
    },

    /**
     * Track API Request
     */
    trackApiRequest: (
      method: string,
      path: string,
      status: number,
      durationMs: number,
    ) => {
      const tags = { method, path, status, success: status < 400 };

      metrics.increment("api.request", 1, tags);
      metrics.distribution("api.latency", durationMs, tags, "millisecond");
    },
  },
};
