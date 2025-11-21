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
/**
 * Aggregate global statistics (users, resumes) periodically.
 * Runs every hour.
 */
exports.aggregateGlobalStats = functions.pubsub
    .schedule("0 * * * *") // Every hour
    .timeZone("UTC")
    .onRun(async (context) => {
    console.log("📊 Starting global stats aggregation...");
    const db = admin.firestore();
    try {
        // Count users
        const usersSnap = await db.collection("users").count().get();
        const userCount = usersSnap.data().count;
        // Count published resumes
        const resumesSnap = await db
            .collection("resumeProfiles")
            .where("published", "==", true)
            .count()
            .get();
        const resumeCount = resumesSnap.data().count;
        // Update global stats document
        await db.collection("analytics").doc("globalStats").set({
            userCount,
            resumeCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Global stats updated: ${userCount} users, ${resumeCount} published resumes`);
        return null;
    }
    catch (error) {
        console.error("Error aggregating global stats:", error);
        return null;
    }
});
//# sourceMappingURL=statsService.js.map