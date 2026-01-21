import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK once at the top level
if (!admin.apps.length) {
  admin.initializeApp();
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

export const generateJobMatchSuggestions = functions
  .runWith({
    secrets: [
      "HUGGINGFACE_TOKEN",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
    ],
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    const { generateJobMatchSuggestionsHandler } = await import(
      "./jobMatchService"
    );
    return generateJobMatchSuggestionsHandler(req, res);
  });

// ==================== EMAIL NOTIFICATIONS ====================
// SMTP credentials are loaded from .env files, not Secret Manager

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { onUserCreatedHandler } = await import("./emailFunctions");
  return onUserCreatedHandler(user);
});

export const onRecruiterRequestCreated = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const { onRecruiterRequestCreatedHandler } = await import(
      "./emailFunctions"
    );
    return onRecruiterRequestCreatedHandler(snap, context);
  });

export const onRecruiterRequestApproved = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const { onRecruiterRequestApprovedHandler } = await import(
      "./emailFunctions"
    );
    return onRecruiterRequestApprovedHandler(change, context);
  });

export const sendProfileViewDigest = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] sendProfileViewDigest blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { sendProfileViewDigestHandler } = await import("./emailFunctions");
    return sendProfileViewDigestHandler(context);
  });

export const notifyAdminSuspiciousActivity = functions.https.onCall(
  async (data, context) => {
    const { notifyAdminSuspiciousActivityHandler } = await import(
      "./emailFunctions"
    );
    return notifyAdminSuspiciousActivityHandler(data, context);
  }
);

export const resendVerificationEmail = functions.https.onCall(
  async (data, context) => {
    const { resendVerificationEmailHandler } = await import("./emailFunctions");
    return resendVerificationEmailHandler(data, context);
  }
);

export const cleanupAuditLogs = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupAuditLogs blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupAuditLogsHandler } = await import("./emailFunctions");
    return cleanupAuditLogsHandler(context);
  });

// ==================== DATA SYNC & FAN-OUT ====================

export const fanOutResumeDocuments = functions.firestore
  .document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const { fanOutResumeDocumentsHandler } = await import(
      "./resumeFanoutService"
    );
    return fanOutResumeDocumentsHandler(change, context);
  });

export const indexResumeOnWrite = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .firestore.document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const { indexResumeOnWriteHandler } = await import("./indexResumeService");
    return indexResumeOnWriteHandler(change, context);
  });

export const reindexResume = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    const { reindexResumeHandler } = await import("./indexResumeService");
    return reindexResumeHandler(data, context);
  });

// ==================== SEARCH ====================

export const searchResumesAI = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    const { searchResumesAIHandler } = await import("./searchResumeService");
    return searchResumesAIHandler(data, context);
  });

export const getSearchQuota = functions.https.onCall(async (data, context) => {
  const { getSearchQuotaHandler } = await import("./searchResumeService");
  return getSearchQuotaHandler(data, context);
});

// ==================== AUTH / ADMIN ====================

export const onUserRoleChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const { onUserRoleChangedHandler } = await import("./authFunctions");
    return onUserRoleChangedHandler(change, context);
  });

export const setUserRole = functions.https.onCall(async (data, context) => {
  const { setUserRoleHandler } = await import("./authFunctions");
  return setUserRoleHandler(data, context);
});

export const syncAdminWhitelist = functions.firestore
  .document("system/admins/whitelist/{email}")
  .onWrite(async (change, context) => {
    const { syncAdminWhitelistHandler } = await import("./adminService");
    return syncAdminWhitelistHandler(change, context);
  });

// ==================== RESUME GENERATION ====================

export const generateResumeContent = functions
  .runWith({
    secrets: [
      "HUGGINGFACE_TOKEN",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
    ],
  })
  .https.onRequest(async (req, res) => {
    const { generateResumeContentHandler } = await import("./resumeService");
    return generateResumeContentHandler(req, res);
  });

// Async resume generation processor (Cloud Task handler)
export const processResumeGenerationAsync = functions
  .runWith({
    secrets: [
      "HUGGINGFACE_TOKEN",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENAI_API_KEY",
    ],
    timeoutSeconds: 540, // 9 minutes max
    memory: "1GB",
  })
  .https.onRequest(async (req, res) => {
    const { processResumeGenerationHandler } = await import(
      "./processResumeGeneration"
    );
    return processResumeGenerationHandler(req, res);
  });

// ==================== ANALYTICS ====================

export const aggregateGlobalStats = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .pubsub.schedule("0 * * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateGlobalStats blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateGlobalStatsHandler } = await import("./statsService");
    return aggregateGlobalStatsHandler(context);
  });

export const aggregateAnalyticsDaily = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] aggregateAnalyticsDaily blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { aggregateAnalyticsDailyHandler } = await import(
      "./analyticsService"
    );
    return aggregateAnalyticsDailyHandler(context);
  });

export const cleanupAnalyticsEvents = functions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupAnalyticsEvents blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupAnalyticsEventsHandler } = await import(
      "./analyticsService"
    );
    return cleanupAnalyticsEventsHandler(context);
  });

// ==================== CLEANUP TASKS ====================

export const cleanupExpiredResumes = functions.pubsub
  .schedule("10 2 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupExpiredResumes blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupExpiredResumesHandler } = await import(
      "./resumeCleanupService"
    );
    return cleanupExpiredResumesHandler(context);
  });

export const cleanupRateLimits = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupRateLimits blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupRateLimitsHandler } = await import(
      "./rateLimitCleanupService"
    );
    return cleanupRateLimitsHandler(context);
  });

export const cleanupRecruiterSearchHistory = functions.pubsub
  .schedule("0 3 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    if (!isProductionEnvironment()) {
      functions.logger.info(
        "[COST GUARD] cleanupRecruiterSearchHistory blocked in dev environment"
      );
      return { skipped: true, reason: "dev environment" };
    }
    const { cleanupRecruiterSearchHistoryHandler } = await import(
      "./recruiterService"
    );
    return cleanupRecruiterSearchHistoryHandler(context);
  });

// ==================== BILLING ====================

export const aggregateBilling = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("UTC")
  .onRun(async (context) => {
    // Billing aggregation should run in all environments to track costs
    const { aggregateBillingHandler } = await import("./billingService");
    return aggregateBillingHandler(context);
  });
