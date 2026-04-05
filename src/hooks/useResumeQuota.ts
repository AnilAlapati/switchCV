"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier } from "@/lib/config";

interface ResumeQuotaData {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  tier: SubscriptionTier;
}

interface UseResumeQuotaResult {
  canCreate: boolean;
  current: number;
  limit: number;
  remaining: number;
  tier: SubscriptionTier | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = async (
  url: string,
  token: string,
): Promise<ResumeQuotaData> => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch resume quota");
  return res.json();
};

/**
 * Hook to check current user's resume creation quota status.
 *
 * Works for all tiers — the limit differs but the check is the same.
 * Backed by the lifetime counter so quota persists across hard deletes.
 *
 * @example
 * const { canCreate, current, limit, loading } = useResumeQuota();
 * if (!canCreate) return <UpgradeCTA />;
 */
export function useResumeQuota(): UseResumeQuotaResult {
  const { user, loading: authLoading } = useAuth();

  const shouldFetch = !authLoading && !!user;
  const key = shouldFetch ? ["/api/resumes/quota", user!.uid] : null;

  const { data, error, isLoading, mutate } = useSWR<ResumeQuotaData>(
    key,
    ([url]: [string, string]) =>
      user!.getIdToken().then((token) => fetcher(url, token)),
    {
      dedupingInterval: 60000, // 1 minute — quota changes are rare
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    canCreate: data?.allowed ?? true, // Optimistic while loading
    current: data?.current ?? 0,
    limit: data?.limit ?? 9999,
    remaining: data?.remaining ?? 9999,
    tier: data?.tier ?? null,
    loading: authLoading || isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch resume quota"
      : null,
    refetch: () => mutate(),
  };
}
