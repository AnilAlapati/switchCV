import * as admin from "firebase-admin";
import { generateResumeContent } from "./resumeService";
import { generateJobMatchSuggestions } from "./jobMatchService";
import {
  aggregateAnalyticsDaily,
  cleanupAnalyticsEvents,
} from "./analyticsService";

export { aggregateGlobalStats } from "./statsService";

admin.initializeApp();

// Initialize environment variable warnings
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!HUGGINGFACE_TOKEN) {
  console.warn(
    "HUGGINGFACE_TOKEN not set. Hugging Face features may not work."
  );
}

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set. Gemini features may not work.");
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
