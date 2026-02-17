"use client";

import useSWR, { KeyedMutator } from "swr";
import { useAuth } from "@/hooks/useAuth";
import {
  SubscriptionTier,
  UserRole,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
  DEV_ROLE_OVERRIDE,
} from "@/lib/config";
import { UserProfile } from "@/types";

interface UseUserProfileResult {
  profile: UserProfile | null;
  tier: SubscriptionTier;
  jobSeekerTier: SubscriptionTier;
  recruiterTier: SubscriptionTier;
  role: UserRole | undefined;
  loading: boolean;
  error: Error | null;
  mutate: KeyedMutator<UserProfile | null>;
}

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch user profile");
  }
  return res.json();
};

export function useUserProfile(): UseUserProfileResult {
  const { user, loading: authLoading } = useAuth();

  const shouldFetch = !authLoading && user;
  const key = shouldFetch
    ? [`/api/user/profile?userId=${user?.uid}`, user?.uid]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    ([url]: [string, string]) =>
      user!.getIdToken().then((token) => fetcher(url, token)),
    {
      // Keep data fresh for 60 seconds
      dedupingInterval: 60000,
      // Don't retry on 404s (profile doesn't exist yet)
      shouldRetryOnError: false,
      // PERF: Do NOT revalidateOnFocus — triggers Firestore reads on every tab switch
      revalidateOnFocus: false,
      // Don't revalidate on reconnect
      revalidateOnReconnect: false,
    },
  );

  // Apply Dev Mode Overrides
  const jobSeekerTier =
    (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) ||
    data?.jobSeekerTier ||
    data?.subscriptionTier ||
    "basic";
  const recruiterTier =
    (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) ||
    data?.recruiterTier ||
    data?.subscriptionTier ||
    "basic";
  const effectiveRole: UserRole | undefined =
    (DEV_MODE_ENABLED && DEV_ROLE_OVERRIDE) || data?.role;

  // For backward compatibility, 'tier' returns the tier for the current role
  const effectiveTier: SubscriptionTier =
    effectiveRole === "recruiter" ? recruiterTier : jobSeekerTier;

  // Construct effective profile
  const effectiveProfile: UserProfile | null = data
    ? {
      ...data,
      subscriptionTier: effectiveTier,
      jobSeekerTier,
      recruiterTier,
      role: effectiveRole as UserRole,
    }
    : user
      ? {
        uid: user.uid,
        email: user.email || "",
        subscriptionTier: effectiveTier,
        jobSeekerTier,
        recruiterTier,
        role: effectiveRole as UserRole,
      }
      : null;

  return {
    profile: effectiveProfile,
    tier: effectiveTier,
    jobSeekerTier,
    recruiterTier,
    role: effectiveRole,
    loading: authLoading || (!!user && isLoading),
    error,
    mutate,
  };
}
