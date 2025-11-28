"use client";

import { SubscriptionTier } from "@/lib/config";
import { useUserProfile } from "@/hooks/useUserProfile";

interface UseTierResult {
  tier: SubscriptionTier;
  loading: boolean;
  error: string | null;
  isBasic: boolean;
  isPremium: boolean;
  isEnterprise: boolean;
  isPremiumOrHigher: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user's subscription tier.
 *
 * Uses the shared useUserProfile hook for caching and dev mode overrides.
 *
 * @example
 * const { tier, isPremiumOrHigher, loading } = useTier();
 *
 * if (loading) return <Spinner />;
 * if (!isPremiumOrHigher) return <UpgradePrompt />;
 * return <PremiumFeature />;
 */
export function useTier(): UseTierResult {
  const { tier, loading, error, mutate } = useUserProfile();

  return {
    tier,
    loading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch tier"
      : null,
    isBasic: tier === "basic",
    isPremium: tier === "premium",
    isEnterprise: tier === "enterprise",
    isPremiumOrHigher: tier === "premium" || tier === "enterprise",
    refetch: async () => {
      await mutate();
    },
  };
}
