import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Performance metric types
 */
export enum MetricType {
  FUNCTION_EXECUTION = "function_execution",
  AI_API_CALL = "ai_api_call",
  DATABASE_QUERY = "database_query",
  EXTERNAL_API = "external_api",
  ERROR_RATE = "error_rate",
}

/**
 * Metric data structure
 */
export interface Metric {
  type: MetricType;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitor for Cloud Functions
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private db: FirebaseFirestore.Firestore;
  private metrics: Metric[] = [];
  private readonly batchSize = 100;
  private readonly flushInterval = 60000; // 1 minute

  private constructor() {
    this.db = admin.firestore();
    this.startAutoFlush();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a metric
   */
  record(metric: Omit<Metric, "timestamp">): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Auto-flush if batch size reached
    if (this.metrics.length >= this.batchSize) {
      this.flush().catch((error) => {
        functions.logger.error("Failed to flush metrics", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  /**
   * Measure execution time of an async function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    type: MetricType = MetricType.FUNCTION_EXECUTION,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let error: Error | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      this.record({
        type,
        name,
        value: duration,
        unit: "ms",
        metadata: {
          ...metadata,
          success: !error,
          error: error?.message,
        },
      });
    }
  }

  /**
   * Flush metrics to Firestore
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      const batch = this.db.batch();
      const metricsRef = this.db.collection("monitoring").doc("metrics");
      const now = new Date();

      // Aggregate metrics by type and name
      const aggregated = this.aggregateMetrics(metricsToFlush);

      // Store aggregated metrics
      const docRef = metricsRef
        .collection("timeseries")
        .doc(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);

      batch.set(
        docRef,
        {
          date: now,
          metrics: admin.firestore.FieldValue.arrayUnion(...aggregated),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      functions.logger.debug("Metrics flushed successfully", {
        count: metricsToFlush.length,
      });
    } catch (error) {
      functions.logger.error("Failed to flush metrics to Firestore", {
        error: error instanceof Error ? error.message : String(error),
        metricsCount: metricsToFlush.length,
      });

      // Restore metrics for retry
      this.metrics = [...metricsToFlush, ...this.metrics];
    }
  }

  /**
   * Aggregate metrics for storage efficiency
   */
  private aggregateMetrics(metrics: Metric[]): any[] {
    const aggregated = new Map<string, any>();

    metrics.forEach((metric) => {
      const key = `${metric.type}:${metric.name}`;
      const existing = aggregated.get(key);

      if (existing) {
        existing.count++;
        existing.totalValue += metric.value;
        existing.minValue = Math.min(existing.minValue, metric.value);
        existing.maxValue = Math.max(existing.maxValue, metric.value);
        existing.avgValue = existing.totalValue / existing.count;

        // Track errors
        if (metric.metadata?.error) {
          existing.errorCount++;
          if (!existing.errors) {
            existing.errors = [];
          }
          existing.errors.push(metric.metadata.error);
        }
      } else {
        aggregated.set(key, {
          type: metric.type,
          name: metric.name,
          unit: metric.unit,
          count: 1,
          totalValue: metric.value,
          avgValue: metric.value,
          minValue: metric.value,
          maxValue: metric.value,
          errorCount: metric.metadata?.error ? 1 : 0,
          errors: metric.metadata?.error ? [metric.metadata.error] : [],
        });
      }
    });

    return Array.from(aggregated.values());
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush().catch((error) => {
          functions.logger.error("Auto-flush failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, this.flushInterval);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    pending: number;
    types: Record<string, number>;
  } {
    const types: Record<string, number> = {};

    this.metrics.forEach((metric) => {
      types[metric.type] = (types[metric.type] || 0) + 1;
    });

    return {
      pending: this.metrics.length,
      types,
    };
  }
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Alert manager for critical issues
 */
export class AlertManager {
  private static instance: AlertManager;
  private db: FirebaseFirestore.Firestore;

  private constructor() {
    this.db = admin.firestore();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Send alert
   */
  async sendAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alert = {
      severity,
      title,
      message,
      metadata,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged: false,
    };

    try {
      await this.db
        .collection("monitoring")
        .doc("alerts")
        .collection("active")
        .add(alert);

      // Log based on severity
      switch (severity) {
        case AlertSeverity.CRITICAL:
        case AlertSeverity.ERROR:
          functions.logger.error(title, { message, ...metadata });
          break;
        case AlertSeverity.WARNING:
          functions.logger.warn(title, { message, ...metadata });
          break;
        default:
          functions.logger.info(title, { message, ...metadata });
      }
    } catch (error) {
      functions.logger.error("Failed to send alert", {
        severity,
        title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check error rate threshold
   */
  async checkErrorRate(
    functionName: string,
    errorCount: number,
    totalCount: number,
    threshold: number = 0.1
  ): Promise<void> {
    const errorRate = totalCount > 0 ? errorCount / totalCount : 0;

    if (errorRate > threshold) {
      await this.sendAlert(
        AlertSeverity.WARNING,
        `High error rate detected: ${functionName}`,
        `Error rate: ${(errorRate * 100).toFixed(
          2
        )}% (${errorCount}/${totalCount})`,
        {
          functionName,
          errorCount,
          totalCount,
          errorRate,
          threshold,
        }
      );
    }
  }

  /**
   * Check performance degradation
   */
  async checkPerformance(
    functionName: string,
    avgDuration: number,
    baseline: number,
    threshold: number = 1.5
  ): Promise<void> {
    const ratio = avgDuration / baseline;

    if (ratio > threshold) {
      await this.sendAlert(
        AlertSeverity.WARNING,
        `Performance degradation detected: ${functionName}`,
        `Average duration: ${avgDuration}ms (baseline: ${baseline}ms, ${(
          ratio * 100
        ).toFixed(0)}%)`,
        {
          functionName,
          avgDuration,
          baseline,
          ratio,
          threshold,
        }
      );
    }
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const alertManager = AlertManager.getInstance();

/**
 * Decorator for automatic performance monitoring
 */
export function monitored(
  name?: string,
  type: MetricType = MetricType.FUNCTION_EXECUTION
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args),
        type
      );
    };

    return descriptor;
  };
}
