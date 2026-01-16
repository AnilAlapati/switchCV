"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { User } from "firebase/auth";
import { DraftResume } from "@/types";

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Draft not found");
    if (res.status === 403) throw new Error("Forbidden");
    throw new Error("Failed to fetch draft");
  }
  return res.json();
};

export function useDraftData(draftId: string | null) {
  const { user } = useAuth();

  const key = user && draftId ? [`/api/drafts/${draftId}`, user] : null;

  const { data, error, isLoading, mutate } = useSWR<DraftResume>(
    key,
    ([url, u]: [string, User]) =>
      u.getIdToken().then((token: string) => fetcher(url, token)),
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    draft: data,
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Error loading draft"
      : null,
    mutate,
  };
}
