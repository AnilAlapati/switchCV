import { NextResponse } from "next/server";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";
import {
  validateSystemConfig,
  validateAICosts,
} from "@/lib/system-config-validator";
import { handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

type PublicSystemConfig = Pick<SystemConfig, "maintenance" | "auth" | "tiers"> & {
  pricing?: SystemConfig["pricing"];
  cache: Pick<SystemConfig["cache"], "systemConfigTtlMs">;
  validation: Pick<SystemConfig["validation"], "username">;
  rateLimits: Pick<SystemConfig["rateLimits"], "usernameCheck">;
};

function toPublicSystemConfig(config: SystemConfig): PublicSystemConfig {
  return {
    maintenance: config.maintenance,
    auth: config.auth,
    tiers: config.tiers,
    pricing: config.pricing,
    cache: {
      systemConfigTtlMs: config.cache.systemConfigTtlMs,
    },
    validation: {
      username: config.validation.username,
    },
    rateLimits: {
      usernameCheck: config.rateLimits.usernameCheck,
    },
  };
}

export async function GET() {
  try {
    const snapshot = await collectionRef(COLLECTIONS.CONFIG).doc("system").get();

    let config: SystemConfig;
    if (snapshot.exists) {
      const rawData = snapshot.data() as Partial<SystemConfig>;
      const mergedConfig = mergeWithDefaultConfig(rawData);
      // Validate and fallback to defaults if invalid
      config = validateSystemConfig(mergedConfig, defaultSystemConfig);
      // Warn about expensive AI models
      validateAICosts(config);
    } else {
      config = defaultSystemConfig;
      logger.warn("⚠️ No system config found in Firebase, using defaults");
    }

    return NextResponse.json(
      {
        config: toPublicSystemConfig(config),
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "Unable to fetch system configuration");
  }
}
