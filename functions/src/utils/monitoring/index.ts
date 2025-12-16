/**
 * Performance Monitor Singleton
 *
 * @module utils/monitoring
 */

import { PerformanceMonitorCore } from "./core";
import { AlertManager } from "./alerts";
import { Metric } from "./types";

/**
 * Performance monitor singleton with lazy initialization
 */
export class PerformanceMonitor extends PerformanceMonitorCore {
  private static instance: PerformanceMonitor;
  private alertManager: AlertManager;

  private constructor() {
    super();
    this.alertManager = new AlertManager();
    this.startAutoFlush();
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record and check metric
   */
  recordMetric(metric: Metric): void {
    this.addMetric(metric);
    this.alertManager.checkAndAlert(metric).catch((error) => {
      console.error("Failed to check alert", error);
    });
  }

  /**
   * Get alert manager for threshold management
   */
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.stopAutoFlush();
      PerformanceMonitor.instance = null as any;
    }
  }
}

// Export singleton instance
export default PerformanceMonitor.getInstance();

// Re-export types and utilities
export * from "./types";
export { PerformanceMonitorCore } from "./core";
export { AlertManager } from "./alerts";
