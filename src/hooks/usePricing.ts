"use client";

import useSWR from "swr";
import type { PricingConfig, PricingTier } from "@/lib/system-config-types";

// =============================================================================
// DEFAULT PRICING FALLBACKS
// =============================================================================
const defaultJobseekerPricing: PricingConfig["jobseeker"] = {
  basic: { price: 0, currency: "USD", displayText: "Free" },
  premium: { price: 9.99, currency: "USD", displayText: "$9.99" },
  enterprise: { price: 39.99, currency: "USD", displayText: "$39.99" },
};

const defaultRecruiterPricing: PricingConfig["recruiter"] = {
  basic: { price: 0, currency: "USD", displayText: "Free" },
  premium: { price: 19.99, currency: "USD", displayText: "$19.99" },
  enterprise: { price: 0, currency: "USD", displayText: "Custom" },
};

const fetcher = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch system config: ${response.status}`);
  }
  return response.json();
};

/**
 * Hook to access pricing configuration for a specific role.
 * Leverages SWR deduplication — shares the /api/system-config fetch with useTierLimits(),
 * so zero additional network calls when both hooks are active.
 *
 * @param role - "jobseeker" or "recruiter"
 * @returns Pricing config for the role with safe fallback to defaults
 */
export function usePricing(
  role: "jobseeker" | "recruiter",
): PricingConfig[typeof role] {
  const { data } = useSWR("/api/system-config", fetcher, {
    dedupingInterval: 300000, // 5 minutes — matches useTierLimits
    revalidateOnFocus: false,
  });

  const config = data as { config?: { pricing?: PricingConfig } } | undefined;
  const pricing = config?.config?.pricing?.[role];

  if (pricing !== undefined && pricing !== null) {
    return pricing;
  }

  return role === "jobseeker"
    ? defaultJobseekerPricing
    : defaultRecruiterPricing;
}

/**
 * Hook to get pricing for a specific tier.
 * @param role - "jobseeker" or "recruiter"
 * @param tier - "basic", "premium", or "enterprise"
 */
export function useTierPrice(
  role: "jobseeker" | "recruiter",
  tier: "basic" | "premium" | "enterprise",
): PricingTier {
  const pricing = usePricing(role);
  return pricing[tier];
}
