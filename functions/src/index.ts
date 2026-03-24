import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const regionalFunctions = functions.region("us-central1");

// Initialize the Firebase Admin SDK once at the top level
if (!admin.apps.length) {
  admin.initializeApp();
  admin.firestore().settings({ ignoreUndefinedProperties: true });
}

/**
 * Determines if the current environment is production.
 * Schedulers should only run in production to avoid dev costs.
 */
function isProductionEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const gcpProject = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  // Production if NODE_ENV is explicitly "production" OR project ID is prod
  return nodeEnv === "production" || gcpProject === "switchcv-e5136";
}

// ==================== JOB MATCHING ====================

export const generateJobMatchSuggestions = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"],
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    const { generateJobMatchSuggestionsHandler } =
      await import("./jobMatchService");
    return generateJobMatchSuggestionsHandler(req, res);
  });

// ==================== EMAIL NOTIFICATIONS ====================
// SMTP credentials are loaded from .env files, not Secret Manager

export const onUserCreated = regionalFunctions.auth
  .user()
  .onCreate(async (user) => {
    const { onUserCreatedHandler } = await import("./emailFunctions");
    return onUserCreatedHandler(user);
  });

export const onRecruiterRequestCreated = regionalFunctions.firestore
  .document("recruiterRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const { onRecruiterRequestCreatedHandler } =
      await import("./emailFunctions");
    return onRecruiterRequestCreatedHandler(snap, context);
  });

export const onRecruiterRequestApproved = regionalFunctions.firestore
  .document("recruiterRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const { onRecruiterRequestApprovedHandler } =
      await import("./emailFunctions");
    return onRecruiterRequestApprovedHandler(change, context);
  });

export const sendProfileViewDigest = regionalFunctions.pubsub
  .schedule("every monday 09:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] sendProfileViewDigest blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { sendProfileViewDigestHandler } = await import("./emailFunctions");
    return sendProfileViewDigestHandler(context);
  });

export const notifyAdminSuspiciousActivity = regionalFunctions.https.onCall(
  async (data, context) => {
    const { notifyAdminSuspiciousActivityHandler } =
      await import("./emailFunctions");
    return notifyAdminSuspiciousActivityHandler(data, context);
  },
);

export const resendVerificationEmail = regionalFunctions.https.onCall(
  async (data, context) => {
    const { resendVerificationEmailHandler } = await import("./emailFunctions");
    return resendVerificationEmailHandler(data, context);
  },
);

// cleanupAuditLogs consolidated into nightlyCleanup (see CLEANUP TASKS section)

// ==================== DATA SYNC & FAN-OUT ====================

export const fanOutResumeDocuments = regionalFunctions.firestore
  .document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const { fanOutResumeDocumentsHandler } =
      await import("./resumeFanoutService");
    return fanOutResumeDocumentsHandler(change, context);
  });

export const indexResumeOnWrite = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .firestore.document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const { indexResumeOnWriteHandler } = await import("./indexResumeService");
    return indexResumeOnWriteHandler(change, context);
  });

export const reindexResume = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    const { reindexResumeHandler } = await import("./indexResumeService");
    return reindexResumeHandler(data, context);
  });

// ==================== SEARCH ====================

export const searchResumesAI = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    const { searchResumesAIHandler } = await import("./searchResumeService");
    return searchResumesAIHandler(data, context);
  });

export const getSearchQuota = regionalFunctions.https.onCall(
  async (data, context) => {
    const { getSearchQuotaHandler } = await import("./searchResumeService");
    return getSearchQuotaHandler(data, context);
  },
);

// ==================== AUTH / ADMIN ====================

export const onUserRoleChanged = regionalFunctions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const { onUserRoleChangedHandler } = await import("./authFunctions");
    return onUserRoleChangedHandler(change, context);
  });

export const setUserRole = regionalFunctions.https.onCall(
  async (data, context) => {
    const { setUserRoleHandler } = await import("./authFunctions");
    return setUserRoleHandler(data, context);
  },
);

export const syncAdminWhitelist = regionalFunctions.firestore
  .document("system/admins/whitelist/{email}")
  .onWrite(async (change, context) => {
    const { syncAdminWhitelistHandler } = await import("./adminService");
    return syncAdminWhitelistHandler(change, context);
  });

// ==================== RESUME GENERATION ====================

export const generateResumeContent = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"],
  })
  .https.onRequest(async (req, res) => {
    const { generateResumeContentHandler } = await import("./resumeService");
    return generateResumeContentHandler(req, res);
  });

// Async resume generation processor (Cloud Task handler)
export const processResumeGenerationAsync = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"],
    timeoutSeconds: 540, // 9 minutes max
    memory: "1GB",
  })
  .https.onRequest(async (req, res) => {
    const { processResumeGenerationHandler } =
      await import("./processResumeGeneration");
    return processResumeGenerationHandler(req, res);
  });

// ==================== ANALYTICS ====================

export const aggregateGlobalStats = regionalFunctions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .pubsub.schedule("0 */6 * * *") // Every 6 hours (reduced from hourly to save ~600 invocations/month)
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateGlobalStats blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateGlobalStatsHandler } = await import("./statsService");
    return aggregateGlobalStatsHandler(context);
  });

export const aggregateAnalyticsDaily = regionalFunctions.pubsub
  .schedule("0 1 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateAnalyticsDaily blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateAnalyticsDailyHandler } =
      await import("./analyticsService");
    return aggregateAnalyticsDailyHandler(context);
  });

export const cleanupAnalyticsEvents = regionalFunctions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupAnalyticsEvents blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupAnalyticsEventsHandler } =
      await import("./analyticsService");
    return cleanupAnalyticsEventsHandler(context);
  });

// ==================== CLEANUP TASKS ====================
// nightlyCleanup consolidates 5 former nightly jobs into 1 Cloud Scheduler job:
//   cleanupAuditLogs, cleanupExpiredResumes, cleanupRateLimits,
//   cleanupRecruiterSearchHistory, cleanupAiMonitoringData
// Savings: 4 fewer Scheduler jobs (~$0.40/month) + fewer cold starts nightly
export const nightlyCleanup = regionalFunctions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 2 * * *") // Daily at 2:00 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] nightlyCleanup blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const results: Record<string, unknown> = {};

    const [
      { cleanupAuditLogsHandler },
      { cleanupExpiredResumesHandler },
      { cleanupRateLimitsHandler },
      { cleanupRecruiterSearchHistoryHandler },
      { cleanupAiMonitoringDataHandler },
    ] = await Promise.all([
      import("./emailFunctions"),
      import("./resumeCleanupService"),
      import("./rateLimitCleanupService"),
      import("./recruiterService"),
      import("./scheduled/cleanupAiMonitoringData"),
    ]);

    const tasks: Array<{ name: string; fn: () => Promise<unknown> }> = [
      { name: "auditLogs", fn: () => cleanupAuditLogsHandler(context) },
      {
        name: "expiredResumes",
        fn: () => cleanupExpiredResumesHandler(context),
      },
      { name: "rateLimits", fn: () => cleanupRateLimitsHandler(context) },
      {
        name: "recruiterSearchHistory",
        fn: () => cleanupRecruiterSearchHistoryHandler(context),
      },
      {
        name: "aiMonitoringData",
        fn: () => cleanupAiMonitoringDataHandler(context),
      },
    ];

    for (const task of tasks) {
      try {
        results[task.name] = await task.fn();
      } catch (err) {
        functions.logger.error(`[nightlyCleanup] ${task.name} failed`, { err });
        results[task.name] = { error: true };
      }
    }

    functions.logger.info("[nightlyCleanup] All cleanups completed", {
      results,
    });
    return results;
  });

export const notifyExpiringResumes = regionalFunctions.pubsub
  .schedule("0 9 * * *") // Daily at 9 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] notifyExpiringResumes blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { notifyExpiringResumesHandler } =
      await import("./scheduled/notifyExpiringResumes");
    return notifyExpiringResumesHandler(context);
  });

// ==================== BILLING ====================

export const aggregateBilling = regionalFunctions.pubsub
  .schedule("0 */6 * * *") // Every 6 hours (reduced from hourly — billing totals don't fluctuate minute-to-minute)
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateBilling blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateBillingHandler } = await import("./billingService");
    return aggregateBillingHandler(context);
  });

// ==================== PRODUCTION MONITORING ====================

/**
 * Budget Monitor — runs hourly, emails when spending exceeds 70%/90%/100% of monthly cap.
 * Uses existing AlertManager → emailService pipeline for notifications.
 */
export const budgetMonitor = regionalFunctions.pubsub
  .schedule("0 */6 * * *") // Every 6 hours (reduced from hourly — saves ~600 invocations/month)
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] budgetMonitor blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { budgetMonitorHandler } = await import("./scheduled/budgetMonitor");
    return budgetMonitorHandler(context);
  });

/**
 * Health Monitor — runs every 30 minutes, emails when Firestore/Gemini/SMTP are down.
 * Tracks consecutive failures, sends recovery notifications when services come back.
 */
export const healthMonitor = regionalFunctions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .pubsub.schedule("0 * * * *") // Every hour (reduced from every 30 min — saves ~720 invocations/month)
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] healthMonitor blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { healthMonitorHandler } = await import("./scheduled/healthMonitor");
    return healthMonitorHandler(context);
  });

export const aggregateAiMonitoring = regionalFunctions
  .runWith({ timeoutSeconds: 120, memory: "256MB" })
  .pubsub.schedule("0 * * * *") // Every hour (reduced from every 15 min — saves ~2,160 invocations/month)
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateAiMonitoring blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateAiMonitoringHandler } =
      await import("./scheduled/aggregateAiMonitoring");
    return aggregateAiMonitoringHandler(context);
  });

export const sendAiMonitoringDigest = regionalFunctions.pubsub
  .schedule("0 8 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] sendAiMonitoringDigest blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { sendAiMonitoringDigestHandler } =
      await import("./scheduled/sendAiMonitoringDigest");
    return sendAiMonitoringDigestHandler(context);
  });

// cleanupAiMonitoringData consolidated into nightlyCleanup (see CLEANUP TASKS section)

export const monitorAiMonitoringHealth = regionalFunctions.pubsub
  .schedule("0 4 * * *") // Daily at 4 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] monitorAiMonitoringHealth blocked in dev environment",
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { monitorAiMonitoringHealthHandler } =
      await import("./scheduled/monitorAiMonitoringHealth");
    return monitorAiMonitoringHealthHandler(context);
  });

/**
 * Secret Rotation Monitor — runs daily to check for expiring secrets.
 */
export { checkSecretRotation } from "./scheduled/secretRotation";
