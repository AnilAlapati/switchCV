import * as functions from "firebase-functions";

export interface EmailConfig {
  service: string;
  user?: string;
  password?: string;
  fromName: string;
  enabled: boolean;
  supportEmail: string;
  adminEmail: string;
}

export interface AiConfig {
  geminiApiKey?: string;
  groqApiKey?: string;
  openaiApiKey?: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
}

export interface AppConfig {
  websiteUrl: string;
  environment: string;
  logLevel: string;
}

export interface RateLimitConfig {
  aiGenerationPerHour: number;
  jobMatchingPerHour: number;
  analyticsPerMinute: number;
}

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCors: boolean;
  enableHelmet: boolean;
  corsOrigin: string[];
}

export interface DatabaseConfig {
  maxRetries: number;
  timeoutMs: number;
  batchSize: number;
}

export interface SearchConfig {
  embeddingModel: string;
  vectorDimension: number;
  maxResults: number;
  minSimilarityScore: number;
  premiumMonthlyQuota: number;
  enterpriseMonthlyQuota: number;
  quotaCollection: string;
}

export interface ConfigState {
  email: EmailConfig;
  ai: AiConfig;
  app: AppConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  database: DatabaseConfig;
  search: SearchConfig;
}

/**
 * Configuration management with validation and defaults
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Partial<ConfigState> = {};

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
    this.config.email = {
      service: process.env.EMAIL_SERVICE || "gmail",
      user: process.env.GMAIL_USER || process.env.EMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD,
      fromName: process.env.EMAIL_FROM_NAME || "SwitchCV",
      enabled: process.env.EMAIL_ENABLED !== "false",
      // Centralized email addresses
      supportEmail: "support@switchcv.com",
      adminEmail: "support@switchcv.com",
    };

    // AI service configuration
    this.config.ai = {
      geminiApiKey: process.env.GEMINI_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.AI_DEFAULT_MODEL || "gemini-1.5-flash",
      timeout: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
    };

    // Application configuration
    this.config.app = {
      websiteUrl: process.env.WEBSITE_URL || "https://switchcv.com",
      environment: process.env.NODE_ENV || "production",
      logLevel: process.env.LOG_LEVEL || "info",
    };

    // Rate limiting configuration
    this.config.rateLimit = {
      aiGenerationPerHour: parseInt(
        process.env.RATE_LIMIT_AI_GENERATION || "10",
        10,
      ),
      jobMatchingPerHour: parseInt(
        process.env.RATE_LIMIT_JOB_MATCHING || "20",
        10,
      ),
      analyticsPerMinute: parseInt(
        process.env.RATE_LIMIT_ANALYTICS || "100",
        10,
      ),
    };

    // Security configuration
    // SECURITY: Default CORS to specific production domains, not 'true' (all origins)
    const defaultCorsOrigins = [
      "https://switchcv.com",
      "https://www.switchcv.com",
      "https://app.switchcv.com",
    ];
    // In development/emulator, allow localhost
    const isDev =
      process.env.FUNCTIONS_EMULATOR === "true" ||
      process.env.NODE_ENV === "development";
    const corsOrigin = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : isDev
        ? [
          ...defaultCorsOrigins,
          "http://localhost:3000",
          "http://localhost:3001",
        ]
        : defaultCorsOrigins;

    this.config.security = {
      enableRateLimit: process.env.ENABLE_RATE_LIMIT !== "false",
      enableCors: process.env.ENABLE_CORS !== "false",
      enableHelmet: process.env.ENABLE_HELMET !== "false",
      corsOrigin,
    };

    // Database configuration
    this.config.database = {
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || "3", 10),
      timeoutMs: parseInt(process.env.DB_TIMEOUT_MS || "10000", 10),
      batchSize: parseInt(process.env.DB_BATCH_SIZE || "500", 10),
    };

    // Search configuration
    this.config.search = {
      embeddingModel:
        process.env.SEARCH_EMBEDDING_MODEL || "text-embedding-004",
      vectorDimension: parseInt(
        process.env.SEARCH_VECTOR_DIMENSION || "768",
        10,
      ),
      maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || "10", 10),
      minSimilarityScore: parseFloat(
        process.env.SEARCH_MIN_SIMILARITY || "0.5",
      ),
      premiumMonthlyQuota: parseInt(
        process.env.SEARCH_QUOTA_PREMIUM || "50",
        10,
      ),
      enterpriseMonthlyQuota: parseInt(
        process.env.SEARCH_QUOTA_ENTERPRISE || "999999",
        10,
      ),
      quotaCollection: process.env.SEARCH_QUOTA_COLLECTION || "searchQuotas",
    };

    this.validateConfig();
  }

  /**
   * Validate critical configuration
   */
  private validateConfig(): void {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check AI configuration
    const aiConfig = this.config.ai;
    if (!aiConfig?.geminiApiKey) {
      warnings.push("GEMINI_API_KEY not set. AI features disabled.");
    }

    // Check email configuration
    const emailConfig = this.config.email;
    if (emailConfig?.enabled && (!emailConfig.user || !emailConfig.password)) {
      warnings.push(
        "Email credentials not configured. Email features may not work.",
      );
    }

    // Check app configuration
    const appConfig = this.config.app;
    if (
      !appConfig?.websiteUrl ||
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
      environment: appConfig?.environment,
      aiProviders: {
        gemini: !!aiConfig?.geminiApiKey,
        groq: !!aiConfig?.groqApiKey,
        openai: !!aiConfig?.openaiApiKey,
      },
      emailEnabled: emailConfig?.enabled,
      rateLimitEnabled: this.config.security?.enableRateLimit,
    });
  }

  /**
   * Get configuration value
   */
  get<K extends keyof ConfigState>(category: K): ConfigState[K] {
    const categoryConfig = this.config[category];

    if (!categoryConfig) {
      throw new Error(`Configuration category not found: ${category}`);
    }

    return categoryConfig as ConfigState[K];
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(category: keyof ConfigState, feature?: string): boolean {
    try {
      const catConfig = this.get(category);
      if (feature && typeof catConfig === 'object') {
        return Boolean((catConfig as any)[feature]);
      }
      return Boolean(catConfig);
    } catch {
      return false;
    }
  }

  /**
   * Get all configuration (for debugging)
   */
  getAll(): Partial<ConfigState> {
    const all: Partial<ConfigState> = {};
    (Object.keys(this.config) as Array<keyof ConfigState>).forEach((key) => {
      all[key] = this.maskSensitiveValues(this.config[key]);
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
    this.config = {};
    this.loadConfig();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

/**
 * Environment helper functions
 */
export const isProduction = (): boolean => {
  return config.get("app").environment === "production";
};

export const isDevelopment = (): boolean => {
  return config.get("app").environment === "development";
};

export const isTest = (): boolean => {
  return config.get("app").environment === "test";
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
