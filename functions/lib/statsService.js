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
exports.aggregateGlobalStats = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const monitoring_1 = require("./utils/monitoring");
const retryHandler_1 = require("./utils/retryHandler");
const USERS_COLLECTION = "users";
const RESUME_COLLECTION = "resumeProfiles";
const ANALYTICS_COLLECTION = "analytics";
const GLOBAL_STATS_DOC = "globalStats";
/**
 * Get Firestore instance (assumes admin is already initialized in index.ts)
 */
const getFirestore = () => {
    return admin.firestore();
};
const databaseConfig = config_1.config.get("database");
const fetchCount = async (query, metricName) => {
    return monitoring_1.performanceMonitor.measure(`stats.${metricName}`, async () => {
        const snapshot = await (0, retryHandler_1.resilientCall)(() => query.count().get(), {
            retryOptions: {
                maxAttempts: databaseConfig.maxRetries,
            },
            timeoutMs: databaseConfig.timeoutMs,
            operationName: `stats-count-${metricName}`,
        });
        const data = snapshot.data();
        const rawCount = data === null || data === void 0 ? void 0 : data.count;
        if (typeof rawCount !== "number" || rawCount < 0) {
            throw new Error(`Unable to read aggregate count for ${metricName}`);
        }
        return rawCount;
    }, monitoring_1.MetricType.DATABASE_QUERY, { metricName });
};
/**
 * Aggregate global statistics (users, resumes) periodically.
 * Runs every hour.
 */
exports.aggregateGlobalStats = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" })
    .pubsub.schedule("0 * * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
    const start = Date.now();
    functions.logger.info("Global stats aggregation started", {
        eventId: context.eventId,
    });
    return monitoring_1.performanceMonitor.measure("functions.aggregateGlobalStats", async () => {
        try {
            const db = getFirestore();
            const statsDocRef = db
                .collection(ANALYTICS_COLLECTION)
                .doc(GLOBAL_STATS_DOC);
            const [userCount, resumeCount, jobSeekerCount, recruiterCount] = await Promise.all([
                fetchCount(db.collection(USERS_COLLECTION), "userCount"),
                fetchCount(db.collection(RESUME_COLLECTION).where("published", "==", true), "resumeCount"),
                fetchCount(db
                    .collection(USERS_COLLECTION)
                    .where("role", "==", "jobseeker"), "jobSeekerCount"),
                fetchCount(db
                    .collection(USERS_COLLECTION)
                    .where("role", "==", "recruiter"), "recruiterCount"),
            ]);
            const payload = {
                userCount,
                resumeCount,
                jobSeekerCount,
                recruiterCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastRunEventId: context.eventId,
            };
            await (0, retryHandler_1.resilientCall)(() => statsDocRef.set(payload, { merge: true }), {
                retryOptions: {
                    maxAttempts: databaseConfig.maxRetries,
                },
                timeoutMs: databaseConfig.timeoutMs,
                operationName: "stats-write-global",
            });
            functions.logger.info("Global stats aggregation completed", {
                userCount,
                resumeCount,
                jobSeekerCount,
                recruiterCount,
                durationMs: Date.now() - start,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await monitoring_1.alertManager.sendAlert(monitoring_1.AlertSeverity.ERROR, "Global stats aggregation failed", message, {
                eventId: context.eventId,
                stack: error instanceof Error ? error.stack : undefined,
            });
            functions.logger.error("Global stats aggregation failed", {
                message,
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }, monitoring_1.MetricType.FUNCTION_EXECUTION, { eventId: context.eventId });
});
//# sourceMappingURL=statsService.js.map