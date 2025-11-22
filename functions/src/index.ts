import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateResumeContent } from "./resumeService";
import { generateJobMatchSuggestions } from "./jobMatchService";
import {
  aggregateAnalyticsDaily,
  cleanupAnalyticsEvents,
} from "./analyticsService";
import { config } from "./config";

export { aggregateGlobalStats } from "./statsService";

admin.initializeApp();

const environment = config.get("app", "environment");
functions.logger.info("SwitchCV Cloud Functions initialized", {
  environment,
});

// Initialize environment variable warnings
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!HUGGINGFACE_TOKEN) {
  functions.logger.warn(
    "HUGGINGFACE_TOKEN not set. Hugging Face features may not work.",
    { feature: "huggingface" }
  );
}

if (!GEMINI_API_KEY) {
  functions.logger.warn(
    "GEMINI_API_KEY not set. Gemini features may not work.",
    {
      feature: "gemini",
    }
  );
}

// ==================== RE-EXPORT FUNCTIONS ====================
export {
  generateResumeContent,
  generateJobMatchSuggestions,
  aggregateAnalyticsDaily,
  cleanupAnalyticsEvents,
};

// ==================== EMAIL AND AUDIT FUNCTIONS ====================
export {
  onUserCreated,
  onRecruiterRequestCreated,
  onRecruiterRequestApproved,
  sendProfileViewDigest,
  notifyAdminSuspiciousActivity,
  cleanupAuditLogs,
} from "./emailFunctions";
