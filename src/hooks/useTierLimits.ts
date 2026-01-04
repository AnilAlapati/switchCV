"use client";

import useSWR from "swr";
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

const defaultLimits: Record<SubscriptionTier, TierLimits> = {
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
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tier limits: ${response.status}`);
  }
  return response.json();
};

export function useTierLimits(): UseTierLimitsResult {
  const { data, error, isLoading, mutate } = useSWR("/api/system-config", fetcher, {
    dedupingInterval: 300000, // 5 minutes
    revalidateOnFocus: false,
  });

  let limits = defaultLimits;

  if (data?.config?.tiers) {
    const tierConfig = data.config.tiers;
    limits = {
      basic: {
        resumeCreationLimit: tierConfig.basic.resumeLimit,
        resumeEditingAllowed: tierConfig.basic.canEdit,
        resumeRetentionDays: 7,
        recruiterSearchLimit: 2,
        recruiterContactLimit: { amount: 2, interval: "lifetime" },
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
  }

  return {
    limits,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch tier limits") : null,
    refetch: async () => { await mutate(); },
  };
}
