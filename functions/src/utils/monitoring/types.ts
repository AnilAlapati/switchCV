/**
 * Metric Types and Interfaces
 *
 * @module utils/monitoring/types
 */

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
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metricType: MetricType;
  condition: "above" | "below" | "equals";
  value: number;
  notifyEmail?: string;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  p95Latency: number;
  p99Latency: number;
}
