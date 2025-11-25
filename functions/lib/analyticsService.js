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
exports.cleanupAnalyticsEvents = exports.aggregateAnalyticsDaily = void 0;
exports.getViewTrendLast7Days = getViewTrendLast7Days;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const retryHandler_1 = require("./utils/retryHandler");
const monitoring_1 = require("./utils/monitoring");
const db = admin.firestore();
const databaseConfig = config_1.config.get("database");
/**
 * Aggregate analytics data daily
 * Runs at 1 AM UTC every day
 */
exports.aggregateAnalyticsDaily = functions.pubsub
    .schedule("0 1 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
    return monitoring_1.performanceMonitor.measure("functions.aggregateAnalyticsDaily", async () => {
        const startTime = Date.now();
        functions.logger.info("Daily analytics aggregation started", {
            eventId: context.eventId,
        });
        const analyticsRef = db.collection("analytics");
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        try {
            const analyticsSnap = await (0, retryHandler_1.resilientCall)(() => analyticsRef.get(), {
                retryOptions: { maxAttempts: databaseConfig.maxRetries },
                timeoutMs: databaseConfig.timeoutMs,
                operationName: "analytics-fetch-collections",
            });
            for (const doc of analyticsSnap.docs) {
                const analyticsId = doc.id;
                const eventsRef = analyticsRef
                    .doc(analyticsId)
                    .collection("events");
                const eventsSnap = await (0, retryHandler_1.resilientCall)(() => eventsRef
                    .where("timestamp", ">=", sevenDaysAgo.toISOString())
                    .get(), {
                    retryOptions: { maxAttempts: databaseConfig.maxRetries },
                    timeoutMs: databaseConfig.timeoutMs,
                    operationName: "analytics-fetch-events",
                });
                const metrics = calculateEngagementMetrics(analyticsId, eventsSnap, now);
                const viewTrend = await getViewTrendLast7Days(analyticsId);
                const engagementMetrics = Object.assign(Object.assign({}, metrics), { viewTrendLast7Days: viewTrend });
                await (0, retryHandler_1.resilientCall)(() => analyticsRef
                    .doc(analyticsId)
                    .collection("engagement")
                    .doc("current")
                    .set(engagementMetrics, { merge: true }), {
                    retryOptions: { maxAttempts: databaseConfig.maxRetries },
                    timeoutMs: databaseConfig.timeoutMs,
                    operationName: "analytics-write-engagement",
                });
                functions.logger.info("Analytics aggregated for document", {
                    analyticsId,
                    eventId: context.eventId,
                });
            }
            functions.logger.info("Daily analytics aggregation completed", {
                durationMs: Date.now() - startTime,
                eventId: context.eventId,
            });
            return null;
        }
        catch (error) {
            await handleAnalyticsError("aggregateAnalyticsDaily", error, context);
            throw error;
        }
    }, monitoring_1.MetricType.FUNCTION_EXECUTION, { eventId: context.eventId });
});
/**
 * Clean up old analytics events
 * Runs weekly to remove events older than 90 days
 */
exports.cleanupAnalyticsEvents = functions.pubsub
    .schedule("0 2 * * 0")
    .timeZone("UTC")
    .onRun(async (context) => {
    return monitoring_1.performanceMonitor.measure("functions.cleanupAnalyticsEvents", async () => {
        const startTime = Date.now();
        functions.logger.info("Analytics cleanup started", {
            eventId: context.eventId,
        });
        const analyticsRef = db.collection("analytics");
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const BATCH_SIZE = 500;
        let deletedCount = 0;
        try {
            const analyticsSnap = await (0, retryHandler_1.resilientCall)(() => analyticsRef.get(), {
                retryOptions: { maxAttempts: databaseConfig.maxRetries },
                timeoutMs: databaseConfig.timeoutMs,
                operationName: "analytics-cleanup-fetch",
            });
            for (const doc of analyticsSnap.docs) {
                const analyticsId = doc.id;
                const eventsRef = analyticsRef
                    .doc(analyticsId)
                    .collection("events");
                let hasMore = true;
                while (hasMore) {
                    const oldEventsSnap = await (0, retryHandler_1.resilientCall)(() => eventsRef
                        .where("timestamp", "<", ninetyDaysAgo.toISOString())
                        .limit(BATCH_SIZE)
                        .get(), {
                        retryOptions: { maxAttempts: databaseConfig.maxRetries },
                        timeoutMs: databaseConfig.timeoutMs,
                        operationName: "analytics-cleanup-scan",
                    });
                    if (oldEventsSnap.empty) {
                        hasMore = false;
                        break;
                    }
                    const batch = db.batch();
                    oldEventsSnap.docs.forEach((eventDoc) => {
                        batch.delete(eventDoc.ref);
                        deletedCount++;
                    });
                    await (0, retryHandler_1.resilientCall)(() => batch.commit(), {
                        retryOptions: { maxAttempts: databaseConfig.maxRetries },
                        timeoutMs: databaseConfig.timeoutMs,
                        operationName: "analytics-cleanup-commit",
                    });
                    functions.logger.info("Batch deleted", {
                        analyticsId,
                        batchSize: oldEventsSnap.size,
                        totalDeleted: deletedCount,
                    });
                    if (oldEventsSnap.size < BATCH_SIZE) {
                        hasMore = false;
                    }
                }
            }
            functions.logger.info("Analytics cleanup completed", {
                deletedCount,
                durationMs: Date.now() - startTime,
                eventId: context.eventId,
            });
            return null;
        }
        catch (error) {
            await handleAnalyticsError("cleanupAnalyticsEvents", error, context);
            throw error;
        }
    }, monitoring_1.MetricType.FUNCTION_EXECUTION, { eventId: context.eventId });
});
/**
 * Calculate engagement metrics from analytics events
 */
function calculateEngagementMetrics(analyticsId, eventsSnap, now) {
    var _a, _b, _c, _d;
    let totalViews = 0;
    const uniqueViewers = new Set();
    let totalSessionDuration = 0;
    let sessionCount = 0;
    const viewsBySource = {
        search: 0,
        direct: 0,
        link: 0,
        recruiter: 0,
        other: 0,
    };
    const topReferrers = {};
    for (const eventDoc of eventsSnap.docs) {
        const event = eventDoc.data();
        if (event.eventType === "view") {
            totalViews++;
            if ((_a = event.metadata) === null || _a === void 0 ? void 0 : _a.viewedBy) {
                uniqueViewers.add(event.metadata.viewedBy);
            }
            if ((_b = event.metadata) === null || _b === void 0 ? void 0 : _b.sessionDuration) {
                totalSessionDuration += event.metadata.sessionDuration;
                sessionCount++;
            }
            if ((_c = event.metadata) === null || _c === void 0 ? void 0 : _c.source) {
                viewsBySource[event.metadata.source] =
                    (viewsBySource[event.metadata.source] || 0) + 1;
            }
            if ((_d = event.metadata) === null || _d === void 0 ? void 0 : _d.referrer) {
                topReferrers[event.metadata.referrer] =
                    (topReferrers[event.metadata.referrer] || 0) + 1;
            }
        }
    }
    const avgSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;
    return {
        resumeId: analyticsId,
        totalViews,
        uniqueViewers: uniqueViewers.size,
        avgSessionDuration: Math.round(avgSessionDuration),
        viewsBySource,
        topReferrers,
        lastViewedAt: now.toISOString(),
    };
}
/**
 * Get view trend for the last 7 days
 */
async function getViewTrendLast7Days(analyticsId) {
    const trend = [];
    const eventsRef = db
        .collection("analytics")
        .doc(analyticsId)
        .collection("events");
    for (let i = 6; i >= 0; i--) {
        const startOfDay = new Date();
        startOfDay.setDate(startOfDay.getDate() - i);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);
        const dayEventsSnap = await (0, retryHandler_1.resilientCall)(() => eventsRef
            .where("timestamp", ">=", startOfDay.toISOString())
            .where("timestamp", "<=", endOfDay.toISOString())
            .where("eventType", "==", "view")
            .get(), {
            retryOptions: { maxAttempts: databaseConfig.maxRetries },
            timeoutMs: databaseConfig.timeoutMs,
            operationName: "analytics-trend-fetch",
        });
        trend.push({
            date: startOfDay.toISOString().split("T")[0],
            count: dayEventsSnap.docs.length,
        });
    }
    return trend;
}
async function handleAnalyticsError(functionName, error, context) {
    const message = error instanceof Error ? error.message : String(error);
    await monitoring_1.alertManager.sendAlert(monitoring_1.AlertSeverity.ERROR, `${functionName} failed`, message, {
        eventId: context.eventId,
        stack: error instanceof Error ? error.stack : undefined,
    });
    functions.logger.error(`${functionName} failed`, {
        message,
        stack: error instanceof Error ? error.stack : undefined,
        eventId: context.eventId,
    });
}
//# sourceMappingURL=analyticsService.js.map