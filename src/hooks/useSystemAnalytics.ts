"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";

interface SystemAnalytics {
    totalUsers: number;
    totalResumes: number;
    activeRecruiters: number;
    totalViews: number;
    totalContactRequests: number;
    averageAttractiveness: number;
    topIndustries: Array<{ name: string; count: number }>;
    recentActivity: Array<{
        type: string;
        timestamp: string;
        description: string;
    }>;
    subscriptionDistribution: {
        basic: number;
        premium: number;
        enterprise: number;
    };
}

const fetcher = async (url: string, token: string) => {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        if (res.status === 403) {
            throw new Error("You do not have permission to view analytics.");
        }
        throw new Error("Failed to fetch analytics");
    }

    return res.json();
};

export function useSystemAnalytics(enabled: boolean = true) {
    const { user } = useAuth();

    const shouldFetch = enabled && !!user;
    const key = shouldFetch ? "/api/analytics/system" : null;

    const { data, error, isLoading, mutate } = useSWR<SystemAnalytics>(
        key,
        (url) => user!.getIdToken().then((token) => fetcher(url, token)),
        {
            // Cache for 5 minutes - analytics data doesn't change frequently
            dedupingInterval: 300000,
            // Don't revalidate on focus to reduce API calls
            revalidateOnFocus: false,
            // Don't revalidate on reconnect
            revalidateOnReconnect: false,
            // Keep previous data while revalidating
            keepPreviousData: true,
        }
    );

    return {
        analytics: data,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Failed to load analytics data") : null,
        refresh: mutate,
    };
}
