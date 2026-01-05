import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
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

export async function GET() {
  try {
    const snapshot = await adminDb.collection("config").doc("system").get();

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

    return NextResponse.json({
      config,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return handleApiError(error, "Unable to fetch system configuration");
  }
}
