import * as functions from "firebase-functions";

/**
 * Configuration management with validation and defaults
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any> = new Map();

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration
   */
  private loadConfig(): void {
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
      aiGenerationPerHour: parseInt(
        process.env.RATE_LIMIT_AI_GENERATION || "10",
        10
      ),
      jobMatchingPerHour: parseInt(
        process.env.RATE_LIMIT_JOB_MATCHING || "20",
        10
      ),
      analyticsPerMinute: parseInt(
        process.env.RATE_LIMIT_ANALYTICS || "100",
        10
      ),
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
  private validateConfig(): void {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check AI configuration
    const aiConfig = this.config.get("ai");
    if (!aiConfig.huggingfaceToken) {
      warnings.push(
        "HUGGINGFACE_TOKEN not set. Hugging Face features disabled."
      );
    }
    if (!aiConfig.geminiApiKey) {
      warnings.push("GEMINI_API_KEY not set. Gemini features disabled.");
    }
    if (!aiConfig.huggingfaceToken && !aiConfig.geminiApiKey) {
      warnings.push(
        "No AI service configured. AI-dependent functions will not work."
      );
    }

    // Check email configuration
    const emailConfig = this.config.get("email");
    if (emailConfig.enabled && (!emailConfig.user || !emailConfig.password)) {
      warnings.push(
        "Email credentials not configured. Email features may not work."
      );
    }

    // Check app configuration
    const appConfig = this.config.get("app");
    if (
      !appConfig.websiteUrl ||
      appConfig.websiteUrl === "https://switchcv.com"
    ) {
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
  get<T = any>(category: string, key?: string): T {
    const categoryConfig = this.config.get(category);

    if (!categoryConfig) {
      throw new Error(`Configuration category not found: ${category}`);
    }

    if (key) {
      return categoryConfig[key] as T;
    }

    return categoryConfig as T;
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(category: string, feature?: string): boolean {
    try {
      const value = feature ? this.get(category, feature) : this.get(category);
      return Boolean(value);
    } catch {
      return false;
    }
  }

  /**
   * Get all configuration (for debugging)
   */
  getAll(): Record<string, any> {
    const all: Record<string, any> = {};
    this.config.forEach((value, key) => {
      // Mask sensitive values
      all[key] = this.maskSensitiveValues(value);
    });
    return all;
  }

  /**
   * Mask sensitive configuration values
   */
  private maskSensitiveValues(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const masked = { ...obj };
    const sensitiveKeys = [
      "password",
      "token",
      "apiKey",
      "secret",
      "key",
      "credentials",
    ];

    for (const key in masked) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        masked[key] = masked[key] ? "***MASKED***" : undefined;
      } else if (typeof masked[key] === "object") {
        masked[key] = this.maskSensitiveValues(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Reload configuration (useful for testing)
   */
  reload(): void {
    this.config.clear();
    this.loadConfig();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

/**
 * Environment helper functions
 */
export const isProduction = (): boolean => {
  return config.get("app", "environment") === "production";
};

export const isDevelopment = (): boolean => {
  return config.get("app", "environment") === "development";
};

export const isTest = (): boolean => {
  return config.get("app", "environment") === "test";
};

/**
 * Get required environment variable
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable not set: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
