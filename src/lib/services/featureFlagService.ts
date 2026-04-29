/**
 * Feature Flag Service
 *
 * Lightweight Firestore-backed feature flags for runtime feature toggling.
 * Reads from `featureFlags` collection — documents are flag name, fields: enabled, description, roles?, tiers?.
 *
 * Caching: In-memory with TTL (default 5 minutes) to minimise Firestore reads.
 *
 * Usage:
 *   import { isFeatureEnabled } from "@/lib/services/featureFlagService";
 *   if (await isFeatureEnabled("agentic-pipeline", { role: "recruiter", tier: "enterprise" })) { … }
 */

import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { cacheService } from "@/lib/services/cacheService";

// ── Types ──────────────────────────────────────────────────────────────

export interface FeatureFlagDoc {
  /** Master kill-switch for this flag */
  enabled: boolean;
  /** Human-readable description */
  description?: string;
  /** If set, only these roles can see the feature. Empty array = all roles. */
  roles?: string[];
  /** If set, only these subscription tiers. Empty array = all tiers. */
  tiers?: string[];
}

export interface FeatureFlagContext {
  role?: string;
  tier?: string;
}

// ── Cache constants ─────────────────────────────────────────────────────

const FLAG_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

// ── Hard-coded defaults (fallback when Firestore is unreachable) ──────

const FLAG_DEFAULTS: Record<string, FeatureFlagDoc> = {
  resume_v2_intake: {
    enabled: true,
    description: "Normalized intake path for resume generation",
  },
  resume_v2_writer: {
    enabled: true,
    description: "Structured writer orchestration path",
  },
  resume_v2_templates: {
    enabled: false,
    description: "Resume v2 premium template rendering track",
  },
  resume_v2_strict_validation: {
    enabled: true,
    description: "Block persistence unless strict quality checks pass",
  },
  resume_v3_function_calling: {
    enabled: true,
    description:
      "Function-calling resume chat (v3) — AI calls typed tools instead of free-text extraction",
    tiers: ["enterprise"],
  },
  resume_v2_creative_polish: {
    enabled: false,
    description: "Evidence-backed creative polish stage for resume v2",
  },
  resume_v2_ai_extraction: {
    enabled: true,
    description:
      "AI-powered structured extraction for resume data (replaces regex). Enabled for premium+ only.",
    tiers: ["premium", "enterprise"],
  },
  resume_file_upload: {
    enabled: true,
    description:
      "Upload PDF/DOCX/TXT to create a resume. Server-side kill switch for upload extraction.",
    tiers: ["premium", "enterprise"],
  },
  "agentic-pipeline": {
    enabled: true,
    description: "4-agent autonomous resume generation pipeline",
    tiers: ["premium", "enterprise"],
  },
  "recruiter-agents": {
    enabled: true,
    description: "AI-powered recruiter agent tools",
    roles: ["recruiter", "admin"],
    tiers: ["premium", "enterprise"],
  },
  "vector-search": {
    enabled: false,
    description: "Embedding-based candidate search (not yet implemented)",
  },
  "gdpr-self-delete": {
    enabled: true,
    description: "Allow users to self-delete their account from settings",
  },
};

// ── Service ────────────────────────────────────────────────────────────

/**
 * Fetch a single feature flag from Firestore (with L1+L2 cacheService).
 * Only caches positive results — missing flags are not stored so defaults apply.
 */
async function fetchFlag(flagName: string): Promise<FeatureFlagDoc | null> {
  const cacheKey = `flags:${flagName}`;

  // L1+L2 cache hit
  const cached = await cacheService.get<FeatureFlagDoc>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const doc = await adminDb.collection("featureFlags").doc(flagName).get();
    const data = doc.exists ? (doc.data() as FeatureFlagDoc) : null;
    // Only cache defined flags — null means "not in Firestore", let defaults handle it
    if (data !== null) {
      await cacheService.set(cacheKey, data, {
        ttlSeconds: FLAG_CACHE_TTL_SECONDS,
        namespace: "flags",
      });
    }
    return data;
  } catch (error) {
    logger.warn(
      { err: error, flagName },
      "Failed to fetch feature flag, using default",
    );
    return null;
  }
}

/**
 * Check if a feature is enabled for the given context.
 *
 * Evaluation order:
 * 1. Fetch from Firestore (cached)
 * 2. Fall back to hard-coded defaults
 * 3. If neither exists, feature is OFF (fail closed)
 */
export async function isFeatureEnabled(
  flagName: string,
  context?: FeatureFlagContext,
): Promise<boolean> {
  const flag = (await fetchFlag(flagName)) ?? FLAG_DEFAULTS[flagName] ?? null;

  if (!flag) return false; // Unknown flag = disabled
  if (!flag.enabled) return false; // Master switch is off

  // Check role restriction
  if (flag.roles && flag.roles.length > 0 && context?.role) {
    if (!flag.roles.includes(context.role)) return false;
  }

  // Check tier restriction
  if (flag.tiers && flag.tiers.length > 0 && context?.tier) {
    if (!flag.tiers.includes(context.tier)) return false;
  }

  return true;
}

/**
 * Fetch all flags and return a summary map (for admin dashboard or debugging).
 */
export async function getAllFlags(): Promise<
  Record<string, FeatureFlagDoc & { source: "firestore" | "default" }>
> {
  const result: Record<
    string,
    FeatureFlagDoc & { source: "firestore" | "default" }
  > = {};

  // Start with defaults
  for (const [name, doc] of Object.entries(FLAG_DEFAULTS)) {
    result[name] = { ...doc, source: "default" };
  }

  // Override with Firestore values
  try {
    const snapshot = await adminDb.collection("featureFlags").limit(100).get();
    for (const doc of snapshot.docs) {
      result[doc.id] = {
        ...(doc.data() as FeatureFlagDoc),
        source: "firestore",
      };
    }
  } catch (error) {
    logger.warn({ err: error }, "Failed to fetch all feature flags");
  }

  return result;
}

/**
 * Invalidate the cache for a specific flag or all flags.
 */
export function invalidateFlagCache(flagName?: string): void {
  if (flagName) {
    void cacheService.invalidate(`flags:${flagName}`);
  } else {
    void cacheService.invalidatePattern("flags:*");
  }
}
