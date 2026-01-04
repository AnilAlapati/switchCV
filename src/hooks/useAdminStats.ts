"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

interface AdminStats {
    totalCost: number;
    budgetCap: number;
    usagePercent: number;
}

const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch admin stats");
    }
    return response.json();
};

export function useAdminStats() {
    const { user } = useAuth();
    const { role } = useUserProfile();

    const shouldFetch = !!user && role === "admin";
    const key = shouldFetch ? "/api/admin/stats" : null;

    const { data, error, isLoading } = useSWR<AdminStats>(
        key,
        fetcher,
        {
            dedupingInterval: 60000,
            revalidateOnFocus: false,
        }
    );

    return {
        stats: data,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Failed to load stats") : null,
    };
}
