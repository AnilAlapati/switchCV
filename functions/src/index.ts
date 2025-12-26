import * as functions from "firebase-functions/v1";

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
  .timeZone("America/New_York")
  .onRun(async (context) => {
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

export const cleanupAuditLogs = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("America/New_York")
  .onRun(async (context) => {
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

// ==================== ANALYTICS ====================

export const aggregateAnalyticsDaily = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    const { aggregateAnalyticsDailyHandler } = await import(
      "./analyticsService"
    );
    return aggregateAnalyticsDailyHandler(context);
  });

export const cleanupAnalyticsEvents = functions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("UTC")
  .onRun(async (context) => {
    const { cleanupAnalyticsEventsHandler } = await import(
      "./analyticsService"
    );
    return cleanupAnalyticsEventsHandler(context);
  });
