"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  SubscriptionTier,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
} from "@/lib/config";

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
 * In dev mode with DEV_TIER_OVERRIDE set, returns the override value.
 * Otherwise fetches from the user profile API.
 *
 * @example
 * const { tier, isPremiumOrHigher, loading } = useTier();
 *
 * if (loading) return <Spinner />;
 * if (!isPremiumOrHigher) return <UpgradePrompt />;
 * return <PremiumFeature />;
 */
export function useTier(): UseTierResult {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("basic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTier = useCallback(async () => {
    // Dev mode override - skip API call
    if (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) {
      setTier(DEV_TIER_OVERRIDE);
      setLoading(false);
      return;
    }

    if (!user) {
      setTier("basic");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/user/profile?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // User profile might not exist yet - default to basic
        if (response.status === 404) {
          setTier("basic");
          return;
        }
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();
      const userTier = data?.subscriptionTier;

      if (userTier && ["basic", "premium", "enterprise"].includes(userTier)) {
        setTier(userTier as SubscriptionTier);
      } else {
        setTier("basic");
      }
    } catch (err) {
      console.error("Error fetching tier:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tier");
      setTier("basic"); // Default to basic on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchTier();
    }
  }, [authLoading, fetchTier]);

  return {
    tier,
    loading: loading || authLoading,
    error,
    isBasic: tier === "basic",
    isPremium: tier === "premium",
    isEnterprise: tier === "enterprise",
    isPremiumOrHigher: tier === "premium" || tier === "enterprise",
    refetch: fetchTier,
  };
}
