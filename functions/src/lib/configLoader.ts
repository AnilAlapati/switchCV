import * as functions from "firebase-functions/v1";
import * as functions_v2 from "firebase-functions";

/**
 * Dual-path configuration loader for Firebase Functions v1 → v7 migration
 *
 * Supports both:
 * - Legacy: functions.config() (v1/v2)
 * - New: process.env / Secret Manager (v7)
 *
 * Switch via environment flag: USE_LEGACY_CONFIG=true|false
 */

export interface FirebaseRuntimeConfig {
  smtp?: {
    host?: string;
    port?: string | number;
    user?: string;
    pass?: string;
  };
  monitoring?: {
    [key: string]: string | number;
  };
  [key: string]: any;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private useLegacyConfig: boolean;
  private cachedConfig: FirebaseRuntimeConfig | null = null;

  private constructor() {
    // Check feature flag
    this.useLegacyConfig = process.env.USE_LEGACY_CONFIG === "true";

    if (this.useLegacyConfig) {
      functions_v2.logger.info(
        "CONFIG_LOADER: Using LEGACY functions.config() mode",
        { timestamp: new Date().toISOString() }
      );
    } else {
      functions_v2.logger.info(
        "CONFIG_LOADER: Using NEW environment variables mode (v7-ready)",
        { timestamp: new Date().toISOString() }
      );
    }
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Get Firebase runtime config (legacy or new)
   */
  getConfig(): FirebaseRuntimeConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    try {
      if (this.useLegacyConfig) {
        this.cachedConfig = this.getLegacyConfig();
      } else {
        this.cachedConfig = this.getNewConfig();
      }
      return this.cachedConfig;
    } catch (error) {
      functions_v2.logger.error("ConfigLoader: Failed to load configuration", {
        error: error instanceof Error ? error.message : String(error),
        mode: this.useLegacyConfig ? "legacy" : "new",
      });
      // Return empty config to prevent crashes
      return {};
    }
  }

  /**
   * Get config from legacy functions.config() API
   */
  private getLegacyConfig(): FirebaseRuntimeConfig {
    try {
      const config = (functions.config as any)();
      return config || {};
    } catch (error) {
      functions_v2.logger.warn(
        "ConfigLoader: Failed to load legacy functions.config()",
        { error: error instanceof Error ? error.message : String(error) }
      );
      return {};
    }
  }

  /**
   * Get config from environment variables (v7-ready)
   */
  private getNewConfig(): FirebaseRuntimeConfig {
    // Build SMTP config from environment variables
    const config: FirebaseRuntimeConfig = {};

    // SMTP configuration
    if (
      process.env.SMTP_HOST ||
      process.env.SMTP_PORT ||
      process.env.SMTP_USER ||
      process.env.SMTP_PASS
    ) {
      config.smtp = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }

    // Monitoring configuration (p95 thresholds)
    const monitoringConfig: Record<string, string | number> = {};
    const monitoringKeys = [
      "p95_threshold_default",
      "p95_threshold_ai_api_call",
      "p95_threshold_database_query",
      "p95_threshold_function_execution",
      "p95_threshold_external_api",
    ];

    monitoringKeys.forEach((key) => {
      const envKey = `MONITORING_${key.toUpperCase()}`;
      if (process.env[envKey]) {
        monitoringConfig[key] = process.env[envKey]!;
      }
    });

    if (Object.keys(monitoringConfig).length > 0) {
      config.monitoring = monitoringConfig;
    }

    return config;
  }

  /**
   * Get a specific value from config
   * e.g., getSMTPValue("host") → "smtp.titan.email"
   */
  getSMTPValue(
    key: "host" | "port" | "user" | "pass"
  ): string | number | undefined {
    const config = this.getConfig();
    return config.smtp?.[key];
  }

  /**
   * Get SMTP configuration
   */
  getSMTPConfig(): FirebaseRuntimeConfig["smtp"] {
    const config = this.getConfig();
    return config.smtp;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig(): Record<string, any> {
    const config = this.getConfig();
    return config.monitoring || {};
  }

  /**
   * Get a monitoring threshold value
   */
  getMonitoringThreshold(key: string, defaultValue?: number): number {
    const config = this.getMonitoringConfig();
    const value = config[key];
    if (value) {
      return parseInt(String(value), 10);
    }
    return defaultValue || 0;
  }

  /**
   * Check which config mode is active (for monitoring/debugging)
   */
  getMode(): "legacy" | "new" {
    return this.useLegacyConfig ? "legacy" : "new";
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
  }
}

// Export singleton
export const configLoader = ConfigLoader.getInstance();
