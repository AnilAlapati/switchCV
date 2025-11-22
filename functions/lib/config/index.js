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
exports.isTest = exports.isDevelopment = exports.isProduction = exports.config = exports.ConfigManager = void 0;
exports.getRequiredEnv = getRequiredEnv;
exports.getOptionalEnv = getOptionalEnv;
const functions = __importStar(require("firebase-functions"));
/**
 * Configuration management with validation and defaults
 */
class ConfigManager {
    constructor() {
        this.config = new Map();
        this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Load and validate configuration
     */
    loadConfig() {
        // Email configuration
        this.config.set("email", {
            service: process.env.EMAIL_SERVICE || "gmail",
            user: process.env.GMAIL_USER || process.env.EMAIL_USER,
            password: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD,
            fromName: process.env.EMAIL_FROM_NAME || "SwitchCV",
            enabled: process.env.EMAIL_ENABLED !== "false",
        });
        // AI service configuration
        this.config.set("ai", {
            huggingfaceToken: process.env.HUGGINGFACE_TOKEN,
            geminiApiKey: process.env.GEMINI_API_KEY,
            defaultModel: process.env.AI_DEFAULT_MODEL || "gemini-1.5-flash",
            timeout: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
            maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
        });
        // Application configuration
        this.config.set("app", {
            websiteUrl: process.env.WEBSITE_URL || "https://switchcv.com",
            environment: process.env.NODE_ENV || "production",
            logLevel: process.env.LOG_LEVEL || "info",
        });
        // Rate limiting configuration
        this.config.set("rateLimit", {
            aiGenerationPerHour: parseInt(process.env.RATE_LIMIT_AI_GENERATION || "10", 10),
            jobMatchingPerHour: parseInt(process.env.RATE_LIMIT_JOB_MATCHING || "20", 10),
            analyticsPerMinute: parseInt(process.env.RATE_LIMIT_ANALYTICS || "100", 10),
        });
        // Security configuration
        this.config.set("security", {
            enableRateLimit: process.env.ENABLE_RATE_LIMIT !== "false",
            enableCors: process.env.ENABLE_CORS !== "false",
            enableHelmet: process.env.ENABLE_HELMET !== "false",
            corsOrigin: process.env.CORS_ORIGIN || true,
        });
        // Database configuration
        this.config.set("database", {
            maxRetries: parseInt(process.env.DB_MAX_RETRIES || "3", 10),
            timeoutMs: parseInt(process.env.DB_TIMEOUT_MS || "10000", 10),
            batchSize: parseInt(process.env.DB_BATCH_SIZE || "500", 10),
        });
        this.validateConfig();
    }
    /**
     * Validate critical configuration
     */
    validateConfig() {
        const warnings = [];
        const errors = [];
        // Check AI configuration
        const aiConfig = this.config.get("ai");
        if (!aiConfig.huggingfaceToken) {
            warnings.push("HUGGINGFACE_TOKEN not set. Hugging Face features disabled.");
        }
        if (!aiConfig.geminiApiKey) {
            warnings.push("GEMINI_API_KEY not set. Gemini features disabled.");
        }
        if (!aiConfig.huggingfaceToken && !aiConfig.geminiApiKey) {
            errors.push("No AI service configured. At least one AI provider required.");
        }
        // Check email configuration
        const emailConfig = this.config.get("email");
        if (emailConfig.enabled && (!emailConfig.user || !emailConfig.password)) {
            warnings.push("Email credentials not configured. Email features may not work.");
        }
        // Check app configuration
        const appConfig = this.config.get("app");
        if (!appConfig.websiteUrl || appConfig.websiteUrl === "https://switchcv.com") {
            warnings.push("WEBSITE_URL not set. Using default.");
        }
        // Log warnings
        warnings.forEach((warning) => {
            functions.logger.warn("Configuration warning", { warning });
        });
        // Throw on critical errors
        if (errors.length > 0) {
            const errorMessage = `Configuration errors: ${errors.join(", ")}`;
            functions.logger.error("Configuration validation failed", {
                errors,
            });
            throw new Error(errorMessage);
        }
        functions.logger.info("Configuration loaded successfully", {
            environment: appConfig.environment,
            aiProviders: {
                huggingface: !!aiConfig.huggingfaceToken,
                gemini: !!aiConfig.geminiApiKey,
            },
            emailEnabled: emailConfig.enabled,
            rateLimitEnabled: this.config.get("security").enableRateLimit,
        });
    }
    /**
     * Get configuration value
     */
    get(category, key) {
        const categoryConfig = this.config.get(category);
        if (!categoryConfig) {
            throw new Error(`Configuration category not found: ${category}`);
        }
        if (key) {
            return categoryConfig[key];
        }
        return categoryConfig;
    }
    /**
     * Check if a feature is enabled
     */
    isEnabled(category, feature) {
        try {
            const value = feature ? this.get(category, feature) : this.get(category);
            return Boolean(value);
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Get all configuration (for debugging)
     */
    getAll() {
        const all = {};
        this.config.forEach((value, key) => {
            // Mask sensitive values
            all[key] = this.maskSensitiveValues(value);
        });
        return all;
    }
    /**
     * Mask sensitive configuration values
     */
    maskSensitiveValues(obj) {
        if (typeof obj !== "object" || obj === null) {
            return obj;
        }
        const masked = Object.assign({}, obj);
        const sensitiveKeys = [
            "password",
            "token",
            "apiKey",
            "secret",
            "key",
            "credentials",
        ];
        for (const key in masked) {
            if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
                masked[key] = masked[key] ? "***MASKED***" : undefined;
            }
            else if (typeof masked[key] === "object") {
                masked[key] = this.maskSensitiveValues(masked[key]);
            }
        }
        return masked;
    }
    /**
     * Reload configuration (useful for testing)
     */
    reload() {
        this.config.clear();
        this.loadConfig();
    }
}
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.config = ConfigManager.getInstance();
/**
 * Environment helper functions
 */
const isProduction = () => {
    return exports.config.get("app", "environment") === "production";
};
exports.isProduction = isProduction;
const isDevelopment = () => {
    return exports.config.get("app", "environment") === "development";
};
exports.isDevelopment = isDevelopment;
const isTest = () => {
    return exports.config.get("app", "environment") === "test";
};
exports.isTest = isTest;
/**
 * Get required environment variable
 */
function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable not set: ${key}`);
    }
    return value;
}
/**
 * Get optional environment variable with default
 */
function getOptionalEnv(key, defaultValue) {
    return process.env[key] || defaultValue;
}
//# sourceMappingURL=index.js.map