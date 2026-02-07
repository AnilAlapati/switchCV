"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { User } from "firebase/auth";
import { DashboardAccessRequest } from "@/app/dashboard/access-requests/types";

// Defining fetcher
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // If 401/403, might handle globally, but throw basic error here
    throw new Error(`Failed to fetch requests: ${res.status}`);
  }
  return res.json();
};

export function useAccessRequests() {
  const { user } = useAuth();

  const key = user
    ? [`/api/jobseeker/access-requests?userId=${user.uid}`, user]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    ([url, u]: [string, User]) =>
      u.getIdToken().then((token: string) => fetcher(url, token)),
    {
      dedupingInterval: 60000, // 1 minute cache
      revalidateOnFocus: false, // PERF: Prevent unnecessary Firestore reads on tab focus
    },
  );

  return {
    requests: (data?.requests || []) as DashboardAccessRequest[],
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to load requests"
      : null,
    mutate,
  };
}
