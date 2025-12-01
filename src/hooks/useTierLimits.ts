"use client";

import { useState, useEffect } from "react";
import { SubscriptionTier } from "@/lib/config";

interface TierLimits {
  resumeCreationLimit: number;
  resumeEditingAllowed: boolean;
  resumeRetentionDays: number | null;
  recruiterSearchLimit: number;
  recruiterContactLimit: {
    amount: number;
    interval: "lifetime" | "month";
  };
}

interface UseTierLimitsResult {
  limits: Record<SubscriptionTier, TierLimits>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get tier limits and configuration for subscription display.
 *
 * Fetches dynamic tier configuration from Firebase via API.
 */
export function useTierLimits(): UseTierLimitsResult {
  const [limits, setLimits] = useState<Record<SubscriptionTier, TierLimits>>({
    basic: {
      resumeCreationLimit: 1,
      resumeEditingAllowed: false,
      resumeRetentionDays: 7,
      recruiterSearchLimit: 2,
      recruiterContactLimit: { amount: 2, interval: "lifetime" },
    },
    premium: {
      resumeCreationLimit: 50,
      resumeEditingAllowed: true,
      resumeRetentionDays: null,
      recruiterSearchLimit: 9999,
      recruiterContactLimit: { amount: 50, interval: "month" },
    },
    enterprise: {
      resumeCreationLimit: 9999,
      resumeEditingAllowed: true,
      resumeRetentionDays: null,
      recruiterSearchLimit: 9999,
      recruiterContactLimit: { amount: 9999, interval: "month" },
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tier configuration from API
      const response = await fetch("/api/system-config");
      if (!response.ok) {
        throw new Error(`Failed to fetch tier limits: ${response.status}`);
      }

      const { config } = await response.json();
      const tierConfig = config.tiers;

      // Transform the data to match our interface
      const transformedLimits: Record<SubscriptionTier, TierLimits> = {
        basic: {
          resumeCreationLimit: tierConfig.basic.resumeLimit,
          resumeEditingAllowed: tierConfig.basic.canEdit,
          resumeRetentionDays: 7, // Static for now
          recruiterSearchLimit: 2, // Static for now
          recruiterContactLimit: { amount: 2, interval: "lifetime" }, // Static for now
        },
        premium: {
          resumeCreationLimit: tierConfig.premium.resumeLimit,
          resumeEditingAllowed: tierConfig.premium.canEdit,
          resumeRetentionDays: null,
          recruiterSearchLimit: 9999,
          recruiterContactLimit: { amount: 50, interval: "month" },
        },
        enterprise: {
          resumeCreationLimit: tierConfig.enterprise.resumeLimit,
          resumeEditingAllowed: tierConfig.enterprise.canEdit,
          resumeRetentionDays: null,
          recruiterSearchLimit: 9999,
          recruiterContactLimit: { amount: 9999, interval: "month" },
        },
      };

      setLimits(transformedLimits);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch tier limits"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  return {
    limits,
    loading,
    error,
    refetch: fetchLimits,
  };
}
