/**
 * Centralized tier restriction messages and utilities
 * Use this module to maintain consistent messaging across the app for premium/enterprise features
 */

export const TIER_RESTRICTION_MESSAGES = {
  AI_EDIT: "Unlock with Premium or Enterprise",
  PREMIUM_FEATURE: "Unlock with Premium or Enterprise",
  ENTERPRISE_FEATURE: "Unlock with Enterprise",
  ADVANCED_SEARCH: "Upgrade for Advanced Search",
  UNLIMITED_RESUMES: "Upgrade for Unlimited Resumes",
  EXTENDED_RETENTION: "Upgrade for Extended Retention",
  PRIORITY_ACTIONS: "Unlock with Premium or Enterprise",
  ANALYTICS_DASHBOARD: "Unlock with Premium or Enterprise",
  BULK_ACTIONS: "Unlock with Premium or Enterprise",
  CUSTOM_BRANDING: "Unlock with Enterprise",
} as const;

export type TierRestrictionKey = keyof typeof TIER_RESTRICTION_MESSAGES;

/**
 * Get a tier restriction message by key
 * @param key - The restriction message key
 * @returns The restriction message
 */
export function getTierRestrictionMessage(key: TierRestrictionKey): string {
  return TIER_RESTRICTION_MESSAGES[key];
}

/**
 * Check if a user tier has access to a feature
 * @param userTier - The user's current tier
 * @param requiredTier - The minimum tier required for the feature
 * @returns true if the user has access, false otherwise
 */
export function hasFeatureAccess(
  userTier: "basic" | "premium" | "enterprise" | null | undefined,
  requiredTier: "premium" | "enterprise"
): boolean {
  if (!userTier) return false;

  if (requiredTier === "enterprise") {
    return userTier === "enterprise";
  }

  // Premium tier includes premium and enterprise
  return userTier === "premium" || userTier === "enterprise";
}

/**
 * Get the appropriate restriction message based on feature requirements
 * @param requiredTier - The minimum tier required
 * @returns The restriction message
 */
export function getFeatureRestrictionMessage(
  requiredTier: "premium" | "enterprise"
): string {
  return requiredTier === "enterprise"
    ? TIER_RESTRICTION_MESSAGES.ENTERPRISE_FEATURE
    : TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE;
}
