/**
 * Core Performance Monitor
 *
 * @module utils/monitoring/core
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Metric, MetricType } from "./types";

/**
 * Core performance monitoring functionality
 */
export class PerformanceMonitorCore {
  protected db: FirebaseFirestore.Firestore | null = null;
  protected metrics: Metric[] = [];
  protected readonly batchSize = 100;
  protected readonly flushInterval = 60000; // 1 minute
  protected flushTimer: NodeJS.Timeout | null = null;

  /**
   * Get Firestore instance
   */
  protected getDb(): FirebaseFirestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Add metric to buffer
   */
  protected addMetric(metric: Metric): void {
    this.metrics.push(metric);

    if (this.metrics.length >= this.batchSize) {
      this.flush().catch((error) => {
        functions.logger.error("Failed to flush metrics", { error });
      });
    }
  }

  /**
   * Flush metrics to Firestore
   */
  protected async flush(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    const batch = this.getDb().batch();
    const metricsToFlush = this.metrics.splice(0, this.batchSize);

    try {
      for (const metric of metricsToFlush) {
        const docRef = this.getDb()
          .collection("metrics")
          .doc(
            `${metric.type}_${metric.name}_${Math.floor(metric.timestamp / 1000)}`
          );

        batch.set(docRef, metric);
      }

      await batch.commit();
      functions.logger.debug("Flushed metrics batch", {
        count: metricsToFlush.length,
      });
    } catch (error) {
      // Re-add metrics to queue if flush fails
      this.metrics.unshift(...metricsToFlush);
      throw error;
    }
  }

  /**
   * Start auto-flush timer
   */
  protected startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        functions.logger.error("Auto-flush error", { error });
      });
    }, this.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  protected stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Record execution metric
   */
  recordExecution(
    name: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: Metric = {
      type: MetricType.FUNCTION_EXECUTION,
      name,
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        success,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Record API call metric
   */
  recordApiCall(
    name: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const metric: Metric = {
      type: MetricType.AI_API_CALL,
      name,
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        statusCode,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Record database query metric
   */
  recordDatabaseQuery(
    name: string,
    duration: number,
    documentCount: number,
    metadata?: Record<string, any>
  ): void {
    const metric: Metric = {
      type: MetricType.DATABASE_QUERY,
      name,
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        documentCount,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Record error metric
   */
  recordError(
    name: string,
    error: Error,
    metadata?: Record<string, any>
  ): void {
    const metric: Metric = {
      type: MetricType.ERROR_RATE,
      name,
      value: 1,
      unit: "count",
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        errorMessage: error.message,
        errorStack: error.stack,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Cleanup and flush remaining metrics
   */
  async shutdown(): Promise<void> {
    this.stopAutoFlush();
    await this.flush();
  }
}
