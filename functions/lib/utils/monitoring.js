"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertManager = exports.performanceMonitor = exports.AlertManager = exports.AlertSeverity = exports.PerformanceMonitor = exports.MetricType = void 0;
exports.monitored = monitored;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const emailService_1 = require("../services/emailService");
/**
 * Performance metric types
 */
var MetricType;
(function (MetricType) {
    MetricType["FUNCTION_EXECUTION"] = "function_execution";
    MetricType["AI_API_CALL"] = "ai_api_call";
    MetricType["DATABASE_QUERY"] = "database_query";
    MetricType["EXTERNAL_API"] = "external_api";
    MetricType["ERROR_RATE"] = "error_rate";
})(MetricType || (exports.MetricType = MetricType = {}));
/**
 * Performance monitor for Cloud Functions
 */
class PerformanceMonitor {
    constructor() {
        this.db = null;
        this.metrics = [];
        this.batchSize = 100;
        this.flushInterval = 60000; // 1 minute
        // Lazy initialization of Firestore to avoid circular dependencies
        this.startAutoFlush();
    }
    getDb() {
        if (!this.db) {
            this.db = admin.firestore();
        }
        return this.db;
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    /**
     * Record a metric
     */
    record(metric) {
        this.metrics.push(Object.assign(Object.assign({}, metric), { timestamp: Date.now() }));
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
    async measure(name, fn, type = MetricType.FUNCTION_EXECUTION, metadata) {
        const startTime = Date.now();
        let error;
        try {
            const result = await fn();
            return result;
        }
        catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
            throw err;
        }
        finally {
            const duration = Date.now() - startTime;
            this.record({
                type,
                name,
                value: duration,
                unit: "ms",
                metadata: Object.assign(Object.assign({}, metadata), { success: !error, error: error === null || error === void 0 ? void 0 : error.message }),
            });
        }
    }
    /**
     * Flush metrics to Firestore
     */
    async flush() {
        if (this.metrics.length === 0) {
            return;
        }
        const metricsToFlush = [...this.metrics];
        this.metrics = [];
        try {
            const db = this.getDb();
            const batch = db.batch();
            const metricsRef = db.collection("monitoring").doc("metrics");
            const now = new Date();
            // Aggregate metrics by type and name
            const aggregated = this.aggregateMetrics(metricsToFlush);
            // Store aggregated metrics
            const docRef = metricsRef
                .collection("timeseries")
                .doc(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
            batch.set(docRef, {
                date: now,
                metrics: admin.firestore.FieldValue.arrayUnion(...aggregated),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            await batch.commit();
            functions.logger.debug("Metrics flushed successfully", {
                count: metricsToFlush.length,
            });
        }
        catch (error) {
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
    aggregateMetrics(metrics) {
        const aggregated = new Map();
        const valuesMap = new Map();
        metrics.forEach((metric) => {
            var _a, _b, _c, _d;
            const key = `${metric.type}:${metric.name}`;
            // Store all values for percentile calculation
            if (!valuesMap.has(key)) {
                valuesMap.set(key, []);
            }
            (_a = valuesMap.get(key)) === null || _a === void 0 ? void 0 : _a.push(metric.value);
            const existing = aggregated.get(key);
            if (existing) {
                existing.count++;
                existing.totalValue += metric.value;
                existing.minValue = Math.min(existing.minValue, metric.value);
                existing.maxValue = Math.max(existing.maxValue, metric.value);
                existing.avgValue = existing.totalValue / existing.count;
                // Track errors
                if ((_b = metric.metadata) === null || _b === void 0 ? void 0 : _b.error) {
                    existing.errorCount++;
                    if (!existing.errors) {
                        existing.errors = [];
                    }
                    existing.errors.push(metric.metadata.error);
                }
            }
            else {
                aggregated.set(key, {
                    type: metric.type,
                    name: metric.name,
                    unit: metric.unit,
                    count: 1,
                    totalValue: metric.value,
                    avgValue: metric.value,
                    minValue: metric.value,
                    maxValue: metric.value,
                    errorCount: ((_c = metric.metadata) === null || _c === void 0 ? void 0 : _c.error) ? 1 : 0,
                    errors: ((_d = metric.metadata) === null || _d === void 0 ? void 0 : _d.error) ? [metric.metadata.error] : [],
                });
            }
        });
        // Calculate P95 for each aggregated metric
        aggregated.forEach((metric, key) => {
            const values = valuesMap.get(key);
            if (values && values.length > 0) {
                values.sort((a, b) => a - b);
                const index = Math.ceil(0.95 * values.length) - 1;
                metric.p95 = values[index];
                // Check P95 threshold
                exports.alertManager.checkP95(metric.name, metric.p95);
            }
        });
        return Array.from(aggregated.values());
    }
    /**
     * Start auto-flush timer
     */
    startAutoFlush() {
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
    getMetricsSummary() {
        const types = {};
        this.metrics.forEach((metric) => {
            types[metric.type] = (types[metric.type] || 0) + 1;
        });
        return {
            pending: this.metrics.length,
            types,
        };
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Alert severity levels
 */
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["ERROR"] = "error";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
/**
 * Alert manager for critical issues
 */
class AlertManager {
    constructor() {
        this.db = null;
        // Lazy initialization to avoid circular dependencies
        this.alertEmailTo = process.env.ALERT_EMAIL_TO || "support@switchcv.com";
        this.alertEmailSubjectPrefix =
            process.env.ALERT_EMAIL_SUBJECT_PREFIX || "[SWITCHCV EMERGENCY]";
    }
    getDb() {
        if (!this.db) {
            this.db = admin.firestore();
        }
        return this.db;
    }
    static getInstance() {
        if (!AlertManager.instance) {
            AlertManager.instance = new AlertManager();
        }
        return AlertManager.instance;
    }
    /**
     * Send alert
     */
    async sendAlert(severity, title, message, metadata) {
        const alert = {
            severity,
            title,
            message,
            metadata,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            acknowledged: false,
        };
        try {
            const db = this.getDb();
            await db
                .collection("monitoring")
                .doc("alerts")
                .collection("active")
                .add(alert);
            if (severity !== AlertSeverity.INFO) {
                await this.sendSupportEmail(severity, title, message, metadata);
            }
            // Log based on severity
            switch (severity) {
                case AlertSeverity.CRITICAL:
                case AlertSeverity.ERROR:
                    functions.logger.error(title, Object.assign({ message }, metadata));
                    break;
                case AlertSeverity.WARNING:
                    functions.logger.warn(title, Object.assign({ message }, metadata));
                    break;
                default:
                    functions.logger.info(title, Object.assign({ message }, metadata));
            }
        }
        catch (error) {
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
    async checkErrorRate(functionName, errorCount, totalCount, threshold = 0.1) {
        const errorRate = totalCount > 0 ? errorCount / totalCount : 0;
        if (errorRate > threshold) {
            await this.sendAlert(AlertSeverity.WARNING, `High error rate detected: ${functionName}`, `Error rate: ${(errorRate * 100).toFixed(2)}% (${errorCount}/${totalCount})`, {
                functionName,
                errorCount,
                totalCount,
                errorRate,
                threshold,
            });
        }
    }
    /**
     * Check performance degradation
     */
    async checkPerformance(functionName, avgDuration, baseline, threshold = 1.5) {
        const ratio = avgDuration / baseline;
        if (ratio > threshold) {
            await this.sendAlert(AlertSeverity.WARNING, `Performance degradation detected: ${functionName}`, `Average duration: ${avgDuration}ms (baseline: ${baseline}ms, ${(ratio * 100).toFixed(0)}%)`, {
                functionName,
                avgDuration,
                baseline,
                ratio,
                threshold,
            });
        }
    }
    /**
     * Check P95 threshold with per-operation support
     * Thresholds can be overridden via Firebase config:
     * - monitoring.p95_threshold_default (global fallback)
     * - monitoring.p95_threshold_ai_api_call (AI operations)
     * - monitoring.p95_threshold_database_query (DB queries)
     * - monitoring.p95_threshold_function_execution (standard functions)
     * - monitoring.p95_threshold_external_api (external APIs)
     */
    async checkP95(functionName, p95Value, operationType) {
        const config = functions.config();
        const monitoringConfig = (config === null || config === void 0 ? void 0 : config.monitoring) || {};
        // Determine operation type from function name patterns if not provided
        const opType = operationType || this.inferOperationType(functionName);
        // Check for operation-specific config override first
        const configKey = `p95_threshold_${opType.replace(/-/g, "_")}`;
        const defaultKey = "p95_threshold_default";
        let threshold;
        if (monitoringConfig[configKey]) {
            threshold = parseInt(monitoringConfig[configKey]);
        }
        else if (monitoringConfig[defaultKey]) {
            threshold = parseInt(monitoringConfig[defaultKey]);
        }
        else {
            // Fall back to built-in defaults
            threshold = AlertManager.DEFAULT_P95_THRESHOLDS[opType]
                || AlertManager.DEFAULT_P95_THRESHOLDS.default;
        }
        if (threshold > 0 && p95Value > threshold) {
            await this.sendAlert(AlertSeverity.WARNING, `High P95 latency detected: ${functionName}`, `P95 latency: ${p95Value}ms (threshold: ${threshold}ms, type: ${opType})`, {
                functionName,
                p95Value,
                threshold,
                operationType: opType,
            });
        }
    }
    /**
     * Infer operation type from function name patterns
     */
    inferOperationType(functionName) {
        const lowerName = functionName.toLowerCase();
        if (lowerName.includes("ai") || lowerName.includes("generate") ||
            lowerName.includes("gemini") || lowerName.includes("llm")) {
            return "ai_api_call";
        }
        if (lowerName.includes("query") || lowerName.includes("fetch") ||
            lowerName.includes("get") || lowerName.includes("firestore")) {
            return "database_query";
        }
        if (lowerName.includes("external") || lowerName.includes("webhook") ||
            lowerName.includes("huggingface")) {
            return "external_api";
        }
        return "function_execution";
    }
    /**
     * Fan out alert emails to the support mailbox
     */
    async sendSupportEmail(severity, title, message, metadata) {
        if (!this.alertEmailTo) {
            return;
        }
        try {
            const metadataSection = metadata
                ? `<pre>${JSON.stringify(metadata, null, 2)}</pre>`
                : "<p>No additional metadata.</p>";
            await emailService_1.emailService.sendCustomEmail({
                to: this.alertEmailTo,
                subject: `${this.alertEmailSubjectPrefix} ${severity.toUpperCase()}: ${title}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>${title}</h2>
            <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
            <p>${message}</p>
            <h3>Metadata</h3>
            ${metadataSection}
            <p style="color:#6b7280;font-size:12px;">Sent automatically by SwitchCV Monitoring</p>
          </div>
        `,
                text: `${title} - ${message}\nSeverity: ${severity}\nMetadata: ${JSON.stringify(metadata || {})}`,
            });
        }
        catch (error) {
            functions.logger.error("Failed to send alert email", {
                error: error instanceof Error ? error.message : String(error),
                severity,
                title,
            });
        }
    }
}
exports.AlertManager = AlertManager;
/**
 * Default P95 thresholds by operation type (in ms)
 * These are sensible defaults based on industry standards
 */
AlertManager.DEFAULT_P95_THRESHOLDS = {
    // Fast operations - database lookups, simple queries
    database_query: 250,
    // Standard API endpoints
    function_execution: 500,
    // External API calls (non-AI)
    external_api: 1000,
    // AI/LLM operations - inherently slow
    ai_api_call: 5000,
    // Default fallback
    default: 1000,
};
// Export singleton instances
exports.performanceMonitor = PerformanceMonitor.getInstance();
exports.alertManager = AlertManager.getInstance();
/**
 * Decorator for automatic performance monitoring
 */
function monitored(name, type = MetricType.FUNCTION_EXECUTION) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const metricName = name || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            return exports.performanceMonitor.measure(metricName, () => originalMethod.apply(this, args), type);
        };
        return descriptor;
    };
}
//# sourceMappingURL=monitoring.js.map