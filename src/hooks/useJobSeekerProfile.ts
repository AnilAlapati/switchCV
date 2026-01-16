"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { ResumeProfile } from "@/types";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
};

export function useJobSeekerProfile() {
    const { user } = useAuth();
    const key = user ? "/api/jobseeker/profile" : null;

    const { data, error, isLoading, mutate } = useSWR<Partial<ResumeProfile>>(
        key,
        fetcher,
        {
            dedupingInterval: 60000,
            revalidateOnFocus: false,
        }
    );

    return {
        profile: data,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Failed to load profile") : null,
        mutate,
    };
}
