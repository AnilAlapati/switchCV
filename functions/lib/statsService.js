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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
const fetchCount = async (query, metricName) => {
    const snapshot = await query.count().get();
    const rawCount = snapshot.data().count;
    if (typeof rawCount !== "number") {
        throw new Error(`Unable to read aggregate count for ${metricName}`);
    }
    return rawCount;
};
/**
 * Aggregate global statistics (users, resumes) periodically.
 * Runs every hour.
 */
exports.aggregateGlobalStats = functions.pubsub
    .schedule("0 * * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
    const start = Date.now();
    functions.logger.info("Global stats aggregation started", {
        eventId: context.eventId,
    });
    try {
        const db = getFirestore();
        const [userCount, resumeCount] = await Promise.all([
            fetchCount(db.collection(USERS_COLLECTION), "userCount"),
            fetchCount(db.collection(RESUME_COLLECTION).where("published", "==", true), "resumeCount"),
        ]);
        const payload = {
            userCount,
            resumeCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRunEventId: context.eventId,
        };
        await db
            .collection(ANALYTICS_COLLECTION)
            .doc(GLOBAL_STATS_DOC)
            .set(payload, { merge: true });
        functions.logger.info("Global stats aggregation completed", {
            userCount,
            resumeCount,
            durationMs: Date.now() - start,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        functions.logger.error("Global stats aggregation failed", {
            message,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
});
//# sourceMappingURL=statsService.js.map