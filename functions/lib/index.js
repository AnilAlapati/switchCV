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
exports.onUserRoleChanged = exports.getSearchQuota = exports.searchResumesAI = exports.reindexResume = exports.indexResumeOnWrite = exports.cleanupAuditLogs = exports.notifyAdminSuspiciousActivity = exports.sendProfileViewDigest = exports.onRecruiterRequestApproved = exports.onRecruiterRequestCreated = exports.onUserCreated = exports.cleanupExpiredResumes = exports.cleanupRecruiterSearchHistory = exports.cleanupAnalyticsEvents = exports.aggregateAnalyticsDaily = exports.generateJobMatchSuggestions = exports.generateResumeContent = exports.aggregateGlobalStats = void 0;
const functions = __importStar(require("firebase-functions/v1"));
require("./config/bootstrap");
const resumeService_1 = require("./resumeService");
Object.defineProperty(exports, "generateResumeContent", { enumerable: true, get: function () { return resumeService_1.generateResumeContent; } });
const jobMatchService_1 = require("./jobMatchService");
Object.defineProperty(exports, "generateJobMatchSuggestions", { enumerable: true, get: function () { return jobMatchService_1.generateJobMatchSuggestions; } });
const analyticsService_1 = require("./analyticsService");
Object.defineProperty(exports, "aggregateAnalyticsDaily", { enumerable: true, get: function () { return analyticsService_1.aggregateAnalyticsDaily; } });
Object.defineProperty(exports, "cleanupAnalyticsEvents", { enumerable: true, get: function () { return analyticsService_1.cleanupAnalyticsEvents; } });
const recruiterService_1 = require("./recruiterService");
Object.defineProperty(exports, "cleanupRecruiterSearchHistory", { enumerable: true, get: function () { return recruiterService_1.cleanupRecruiterSearchHistory; } });
const resumeCleanupService_1 = require("./resumeCleanupService");
Object.defineProperty(exports, "cleanupExpiredResumes", { enumerable: true, get: function () { return resumeCleanupService_1.cleanupExpiredResumes; } });
var statsService_1 = require("./statsService");
Object.defineProperty(exports, "aggregateGlobalStats", { enumerable: true, get: function () { return statsService_1.aggregateGlobalStats; } });
// Initialize environment variable warnings
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!HUGGINGFACE_TOKEN) {
    functions.logger.warn("HUGGINGFACE_TOKEN not set. Hugging Face features may not work.", { feature: "huggingface" });
}
if (!GEMINI_API_KEY) {
    functions.logger.warn("GEMINI_API_KEY not set. Gemini features may not work.", {
        feature: "gemini",
    });
}
// ==================== EMAIL AND AUDIT FUNCTIONS ====================
var emailFunctions_1 = require("./emailFunctions");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return emailFunctions_1.onUserCreated; } });
Object.defineProperty(exports, "onRecruiterRequestCreated", { enumerable: true, get: function () { return emailFunctions_1.onRecruiterRequestCreated; } });
Object.defineProperty(exports, "onRecruiterRequestApproved", { enumerable: true, get: function () { return emailFunctions_1.onRecruiterRequestApproved; } });
Object.defineProperty(exports, "sendProfileViewDigest", { enumerable: true, get: function () { return emailFunctions_1.sendProfileViewDigest; } });
Object.defineProperty(exports, "notifyAdminSuspiciousActivity", { enumerable: true, get: function () { return emailFunctions_1.notifyAdminSuspiciousActivity; } });
Object.defineProperty(exports, "cleanupAuditLogs", { enumerable: true, get: function () { return emailFunctions_1.cleanupAuditLogs; } });
// ==================== AI SEARCH FUNCTIONS ====================
var indexResumeService_1 = require("./indexResumeService");
Object.defineProperty(exports, "indexResumeOnWrite", { enumerable: true, get: function () { return indexResumeService_1.indexResumeOnWrite; } });
Object.defineProperty(exports, "reindexResume", { enumerable: true, get: function () { return indexResumeService_1.reindexResume; } });
var searchResumeService_1 = require("./searchResumeService");
Object.defineProperty(exports, "searchResumesAI", { enumerable: true, get: function () { return searchResumeService_1.searchResumesAI; } });
Object.defineProperty(exports, "getSearchQuota", { enumerable: true, get: function () { return searchResumeService_1.getSearchQuota; } });
// ==================== AUTH FUNCTIONS ====================
var authFunctions_1 = require("./authFunctions");
Object.defineProperty(exports, "onUserRoleChanged", { enumerable: true, get: function () { return authFunctions_1.onUserRoleChanged; } });
//# sourceMappingURL=index.js.map