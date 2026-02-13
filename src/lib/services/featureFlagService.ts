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

// ── In-memory cache ────────────────────────────────────────────────────

interface CacheEntry {
  data: FeatureFlagDoc | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const flagCache = new Map<string, CacheEntry>();

// ── Hard-coded defaults (fallback when Firestore is unreachable) ──────

const FLAG_DEFAULTS: Record<string, FeatureFlagDoc> = {
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
 * Fetch a single feature flag from Firestore (with cache).
 */
async function fetchFlag(flagName: string): Promise<FeatureFlagDoc | null> {
  const cached = flagCache.get(flagName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const doc = await adminDb.collection("featureFlags").doc(flagName).get();
    const data = doc.exists ? (doc.data() as FeatureFlagDoc) : null;
    flagCache.set(flagName, { data, fetchedAt: Date.now() });
    return data;
  } catch (error) {
    logger.warn(
      { err: error, flagName },
      "Failed to fetch feature flag, using default",
    );
    // Return cached value even if stale, or fall through to default
    return cached?.data ?? null;
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
    flagCache.delete(flagName);
  } else {
    flagCache.clear();
  }
}
