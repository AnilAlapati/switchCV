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
  return `${baseUrl}/resume/${resumeId}`;
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
