/**
 * Environment and Configuration Management
 * Handles environment-specific URLs and settings
 */

export const getBaseUrl = (): string => {
  // Client-side: use environment variable
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      "http://localhost:3000"
    );
  }

  // Server-side: use environment variable or default
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  );
};

export const getResumeUrl = (resumeId: number | string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/resumes/${resumeId}`;
};

export const getDashboardUrl = (): string => {
  return `${getBaseUrl()}/dashboard`;
};

export const getOnboardingUrl = (): string => {
  return `${getBaseUrl()}/onboarding`;
};

/**
 * For email links and backend functions that need URLs
 * Always use explicit localhost in dev, actual domain in prod
 */
export const getEmailBaseUrl = (): string => {
  const env = process.env.NODE_ENV || "development";

  if (env === "development") {
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  }

  // Production
  return (
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://switchcv.com"
  );
};

/**
 * Feature Flags
 *
 * Configure via environment variables:
 * - NEXT_PUBLIC_ENABLE_SEEDING_DEBUG: Enable resume seeding and debug lists
 */

/**
 * Enable seeding and debug lists in dashboard.
 * Set NEXT_PUBLIC_ENABLE_SEEDING_DEBUG=true in .env.local for development.
 * Never enable in production without explicit override.
 */
export const ENABLE_SEEDING_AND_DEBUG_LISTS =
  process.env.NEXT_PUBLIC_ENABLE_SEEDING_DEBUG === "true" &&
  process.env.NODE_ENV !== "production";

export type SubscriptionTier = "basic" | "premium" | "enterprise";

export type SeedStrategy = "template" | "live";

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const SEEDING_PLAN_LIMITS: Record<
  SubscriptionTier,
  {
    monthlyWrites: number;
    strategy: SeedStrategy;
  }
> = {
  basic: {
    monthlyWrites: toNumber(process.env.SEED_BASIC_MONTHLY_LIMIT, 5),
    strategy: "template",
  },
  premium: {
    monthlyWrites: toNumber(process.env.SEED_PREMIUM_MONTHLY_LIMIT, 50),
    strategy: "live",
  },
  enterprise: {
    monthlyWrites: toNumber(process.env.SEED_ENTERPRISE_MONTHLY_LIMIT, 200),
    strategy: "live",
  },
};

export const RESUME_CREATION_LIMITS: Record<SubscriptionTier, number> = {
  basic: 1,
  premium: 50,
  enterprise: 9999,
};

export const RESUME_EDITING_ALLOWED: Record<SubscriptionTier, boolean> = {
  basic: false,
  premium: true,
  enterprise: true,
};

export const RESUME_RETENTION_DAYS: Record<SubscriptionTier, number | null> = {
  basic: 7,
  premium: null, // Forever
  enterprise: null, // Forever
};

export const RESUME_DELETION_GRACE_DAYS: Record<
  SubscriptionTier,
  number | null
> = {
  basic: 3, // Delete on day 10 (7 + 3)
  premium: null,
  enterprise: null,
};

export const RESUME_EXPIRY_WARNING_HOURS: Record<
  SubscriptionTier,
  number | null
> = {
  basic: 72, // Show timer for final 72 hours
  premium: null,
  enterprise: null,
};

export const RECRUITER_CONTACT_LIMITS: Record<
  SubscriptionTier,
  { amount: number; interval: "lifetime" | "month" }
> = {
  basic: { amount: 2, interval: "lifetime" },
  premium: { amount: 50, interval: "month" },
  enterprise: { amount: 9999, interval: "month" },
};

export const RECRUITER_SEARCH_LIMITS: Record<SubscriptionTier, number> = {
  basic: 2,
  premium: 9999,
  enterprise: 9999,
};

export const GLOBAL_LIVE_SEED_MONTHLY_LIMIT = toNumber(
  process.env.SEED_GLOBAL_LIVE_MONTHLY_LIMIT,
  3000
);

/**
 * =============================================================================
 * DEV MODE OVERRIDES
 * =============================================================================
 * These settings allow developers to bypass tier/role restrictions during local
 * development. They are AUTOMATICALLY DISABLED in production builds.
 *
 * Usage in .env.local:
 *   NEXT_PUBLIC_DEV_MODE=true
 *   NEXT_PUBLIC_DEV_TIER=enterprise    # or: basic, premium
 *   NEXT_PUBLIC_DEV_ROLE=recruiter     # or: jobseeker, admin
 *
 * Quick commands:
 *   npm run dev:enterprise  # Full access (enterprise + recruiter)
 *   npm run dev:basic       # Test limitations (basic + jobseeker)
 *   npm run dev             # Use real Firestore values
 */

export type UserRole = "jobseeker" | "recruiter" | "admin";

/**
 * Dev mode is enabled when:
 * 1. NODE_ENV is NOT production (build-time safety)
 * 2. NEXT_PUBLIC_DEV_MODE is explicitly set to "true" (opt-in)
 */
export const DEV_MODE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_MODE === "true";

/**
 * Override subscription tier for all users in dev mode.
 * Returns undefined if not set or invalid, meaning use Firestore value.
 */
export const DEV_TIER_OVERRIDE: SubscriptionTier | undefined = (() => {
  if (!DEV_MODE_ENABLED) return undefined;
  const tier = process.env.NEXT_PUBLIC_DEV_TIER;
  if (tier && ["basic", "premium", "enterprise"].includes(tier)) {
    return tier as SubscriptionTier;
  }
  return undefined;
})();

/**
 * Override user role for all users in dev mode.
 * Returns undefined if not set or invalid, meaning use Firestore value.
 */
export const DEV_ROLE_OVERRIDE: UserRole | undefined = (() => {
  if (!DEV_MODE_ENABLED) return undefined;
  const role = process.env.NEXT_PUBLIC_DEV_ROLE;
  if (role && ["jobseeker", "recruiter", "admin"].includes(role)) {
    return role as UserRole;
  }
  return undefined;
})();

/**
 * Get current dev mode status for display purposes
 */
export const getDevModeStatus = (): {
  enabled: boolean;
  tierOverride: SubscriptionTier | undefined;
  roleOverride: UserRole | undefined;
} => ({
  enabled: DEV_MODE_ENABLED,
  tierOverride: DEV_TIER_OVERRIDE,
  roleOverride: DEV_ROLE_OVERRIDE,
});
