/**
 * Server-Only Configuration Functions
 *
 * This file contains configuration functions that require server-only modules (firebase-admin).
 * These functions should ONLY be imported in API routes or server components.
 *
 * For client-safe configuration, import from @/lib/config or @/lib/config.client
 */

import type { SubscriptionTier } from "@/lib/config.client";
import { getConstants } from "@/lib/getSystemConfig";

/**
 * Get tier configuration from system config
 */
export const getTierConfig = async () => {
  const constants = await getConstants();
  return constants.tiers;
};

/**
 * Get resume creation limits from system config
 */
export const getResumeCreationLimits = async (): Promise<
  Record<SubscriptionTier, number>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.resumeLimit,
    premium: tiers.premium.resumeLimit,
    enterprise: tiers.enterprise.resumeLimit,
  };
};

/**
 * Get resume editing permissions from system config
 */
export const getResumeEditingAllowed = async (): Promise<
  Record<SubscriptionTier, boolean>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.canEdit,
    premium: tiers.premium.canEdit,
    enterprise: tiers.enterprise.canEdit,
  };
};

/**
 * Get resume retention days from system config
 */
export const getResumeRetentionDays = async (): Promise<
  Record<SubscriptionTier, number | null>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.retentionDays,
    premium: tiers.premium.retentionDays,
    enterprise: tiers.enterprise.retentionDays,
  };
};

/**
 * Get resume deletion grace period days from system config
 */
export const getResumeDeletionGraceDays = async (): Promise<
  Record<SubscriptionTier, number | null>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.deletionGracePeriodDays,
    premium: tiers.premium.deletionGracePeriodDays,
    enterprise: tiers.enterprise.deletionGracePeriodDays,
  };
};

/**
 * Get resume expiry warning hours from system config
 */
export const getResumeExpiryWarningHours = async (): Promise<
  Record<SubscriptionTier, number | null>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.expiryWarningHours,
    premium: tiers.premium.expiryWarningHours,
    enterprise: tiers.enterprise.expiryWarningHours,
  };
};

/**
 * Get recruiter contact limits from system config
 */
export const getRecruiterContactLimits = async (): Promise<
  Record<SubscriptionTier, { amount: number; interval: "lifetime" | "month" }>
> => {
  const tiers = await getTierConfig();
  return {
    basic: {
      amount: tiers.basic.recruiterContacts.total || 2,
      interval: "lifetime",
    },
    premium: {
      amount: tiers.premium.recruiterContacts.perMonth || 50,
      interval: "month",
    },
    enterprise: {
      amount: tiers.enterprise.recruiterContacts.perMonth || 9999,
      interval: "month",
    },
  };
};

/**
 * Get recruiter search limits from system config
 */
export const getRecruiterSearchLimits = async (): Promise<
  Record<SubscriptionTier, number>
> => {
  const tiers = await getTierConfig();
  return {
    basic: tiers.basic.recruiterSearches,
    premium: tiers.premium.recruiterSearches,
    enterprise: tiers.enterprise.recruiterSearches,
  };
};
