"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import {
  SubscriptionTier,
  UserRole,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
  DEV_ROLE_OVERRIDE,
} from "@/lib/config";

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: SubscriptionTier;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
}

interface UseUserProfileResult {
  profile: UserProfile | null;
  tier: SubscriptionTier;
  role: UserRole | undefined;
  loading: boolean;
  error: any;
  mutate: () => Promise<any>;
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
    ([url]) => user!.getIdToken().then((token) => fetcher(url, token)),
    {
      // Keep data fresh for 5 minutes
      dedupingInterval: 300000,
      // Don't retry on 404s (profile doesn't exist yet)
      shouldRetryOnError: false,
    }
  );

  // Apply Dev Mode Overrides
  const effectiveTier: SubscriptionTier =
    (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) ||
    data?.subscriptionTier ||
    "basic";

  const effectiveRole: UserRole | undefined =
    (DEV_MODE_ENABLED && DEV_ROLE_OVERRIDE) || data?.role;

  // Construct effective profile
  const effectiveProfile: UserProfile | null = data
    ? {
        ...data,
        subscriptionTier: effectiveTier,
        role: effectiveRole as UserRole,
      }
    : user
    ? {
        uid: user.uid,
        email: user.email || "",
        subscriptionTier: effectiveTier,
        role: effectiveRole as UserRole,
      }
    : null;

  return {
    profile: effectiveProfile,
    tier: effectiveTier,
    role: effectiveRole,
    loading: authLoading || (!!user && isLoading),
    error,
    mutate,
  };
}
