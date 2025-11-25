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
        metrics.forEach((metric) => {
            var _a, _b, _c;
            const key = `${metric.type}:${metric.name}`;
            const existing = aggregated.get(key);
            if (existing) {
                existing.count++;
                existing.totalValue += metric.value;
                existing.minValue = Math.min(existing.minValue, metric.value);
                existing.maxValue = Math.max(existing.maxValue, metric.value);
                existing.avgValue = existing.totalValue / existing.count;
                // Track errors
                if ((_a = metric.metadata) === null || _a === void 0 ? void 0 : _a.error) {
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
                    errorCount: ((_b = metric.metadata) === null || _b === void 0 ? void 0 : _b.error) ? 1 : 0,
                    errors: ((_c = metric.metadata) === null || _c === void 0 ? void 0 : _c.error) ? [metric.metadata.error] : [],
                });
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
}
exports.AlertManager = AlertManager;
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