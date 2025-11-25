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
exports.RateLimitPresets = exports.FirestoreRateLimiter = void 0;
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.checkRateLimit = checkRateLimit;
exports.cleanupExpiredRateLimits = cleanupExpiredRateLimits;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
/**
 * Rate limiter using Firestore
 */
class FirestoreRateLimiter {
    constructor(config) {
        this.db = admin.firestore();
        this.config = config;
    }
    /**
     * Check and consume rate limit for a user
     */
    async checkLimit(userId) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const docRef = this.db
            .collection("rateLimits")
            .doc(`${this.config.keyPrefix}_${userId}`);
        try {
            const result = await this.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    // First request in this window
                    transaction.set(docRef, {
                        requests: [now],
                        windowStart: now,
                        expiresAt: new Date(now + this.config.windowMs * 2), // TTL for cleanup
                    });
                    return {
                        allowed: true,
                        remaining: this.config.maxRequests - 1,
                        resetTime: now + this.config.windowMs,
                    };
                }
                const data = doc.data();
                let requests = (data.requests || []);
                // Remove requests outside the current window
                requests = requests.filter((timestamp) => timestamp > windowStart);
                if (requests.length >= this.config.maxRequests) {
                    // Rate limit exceeded
                    const oldestRequest = Math.min(...requests);
                    const resetTime = oldestRequest + this.config.windowMs;
                    const retryAfter = Math.ceil((resetTime - now) / 1000); // seconds
                    return {
                        allowed: false,
                        remaining: 0,
                        resetTime,
                        retryAfter,
                    };
                }
                // Add current request
                requests.push(now);
                transaction.update(docRef, {
                    requests,
                    windowStart: requests[0],
                    expiresAt: new Date(now + this.config.windowMs * 2),
                });
                return {
                    allowed: true,
                    remaining: this.config.maxRequests - requests.length,
                    resetTime: requests[0] + this.config.windowMs,
                };
            });
            return result;
        }
        catch (error) {
            functions.logger.error("Rate limit check failed", {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
            // On error, allow request but log it
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                resetTime: now + this.config.windowMs,
            };
        }
    }
    /**
     * Reset rate limit for a user (admin use)
     */
    async resetLimit(userId) {
        const docRef = this.db
            .collection("rateLimits")
            .doc(`${this.config.keyPrefix}_${userId}`);
        await docRef.delete();
    }
    /**
     * Get current rate limit status
     */
    async getStatus(userId) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const docRef = this.db
            .collection("rateLimits")
            .doc(`${this.config.keyPrefix}_${userId}`);
        const doc = await docRef.get();
        if (!doc.exists) {
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                resetTime: now + this.config.windowMs,
            };
        }
        const data = doc.data();
        let requests = (data.requests || []);
        requests = requests.filter((timestamp) => timestamp > windowStart);
        return {
            allowed: requests.length < this.config.maxRequests,
            remaining: Math.max(0, this.config.maxRequests - requests.length),
            resetTime: requests.length > 0
                ? requests[0] + this.config.windowMs
                : now + this.config.windowMs,
        };
    }
}
exports.FirestoreRateLimiter = FirestoreRateLimiter;
/**
 * Express middleware for rate limiting
 */
function createRateLimitMiddleware(config) {
    const limiter = new FirestoreRateLimiter(config);
    return async (req, res, next) => {
        var _a;
        try {
            // Extract user ID from request (assumes auth middleware ran first)
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
            if (!userId) {
                res.status(401).json({ error: "Authentication required" });
                return;
            }
            const result = await limiter.checkLimit(userId);
            // Set rate limit headers
            res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
            res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
            res.setHeader("X-RateLimit-Reset", Math.floor(result.resetTime / 1000).toString());
            if (!result.allowed) {
                functions.logger.warn("Rate limit exceeded", {
                    userId,
                    keyPrefix: config.keyPrefix,
                    retryAfter: result.retryAfter,
                });
                res.setHeader("Retry-After", (result.retryAfter || 60).toString());
                res.status(429).json({
                    error: "Too many requests",
                    message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
                    retryAfter: result.retryAfter,
                });
                return;
            }
            next();
        }
        catch (error) {
            functions.logger.error("Rate limit middleware error", {
                error: error instanceof Error ? error.message : String(error),
            });
            // On error, allow request to proceed
            next();
        }
    };
}
/**
 * Cloud Function rate limiter (for non-Express functions)
 */
async function checkRateLimit(userId, config) {
    const limiter = new FirestoreRateLimiter(config);
    const result = await limiter.checkLimit(userId);
    return {
        allowed: result.allowed,
        retryAfter: result.retryAfter,
    };
}
/**
 * Cleanup expired rate limit records
 */
async function cleanupExpiredRateLimits() {
    const db = admin.firestore();
    const now = new Date();
    let deletedCount = 0;
    try {
        const expiredDocs = await db
            .collection("rateLimits")
            .where("expiresAt", "<", now)
            .limit(500)
            .get();
        const batch = db.batch();
        expiredDocs.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        await batch.commit();
        functions.logger.info("Cleaned up expired rate limits", {
            count: deletedCount,
        });
        return deletedCount;
    }
    catch (error) {
        functions.logger.error("Rate limit cleanup failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        return 0;
    }
}
/**
 * Predefined rate limit configurations
 */
exports.RateLimitPresets = {
    // AI generation: 10 requests per hour
    AI_GENERATION: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        keyPrefix: "ai_generation",
    },
    // Job matching: 20 requests per hour
    JOB_MATCHING: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
        keyPrefix: "job_matching",
    },
    // Analytics: 100 requests per minute
    ANALYTICS: {
        windowMs: 60 * 1000,
        maxRequests: 100,
        keyPrefix: "analytics",
    },
    // Auth: 5 requests per minute
    AUTH: {
        windowMs: 60 * 1000,
        maxRequests: 5,
        keyPrefix: "auth",
    },
};
//# sourceMappingURL=rateLimiter.js.map