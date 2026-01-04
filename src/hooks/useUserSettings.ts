"use client";

import useSWR, { MutatorCallback } from "swr";
import { useAuth } from "@/hooks/useAuth";

export interface UserSettings {
    isRecruiter: boolean;
    displayName: string;
    companyName: string;
    updatedAt: string;
    notifications?: {
        marketing: boolean;
        security: boolean;
        activity: boolean;
    };
    privacy?: {
        profilePublic: boolean;
        searchable: boolean;
    };
}

const fetcher = async (url: string, token: string) => {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch settings");
    }

    return response.json();
};

export function useUserSettings() {
    const { user, loading: authLoading } = useAuth();

    const shouldFetch = !!user && !authLoading;
    const key = shouldFetch ? `/api/user/settings?userId=${user.uid}` : null;

    const { data, error, isLoading, mutate } = useSWR<UserSettings>(
        key,
        async (url) => {
            const token = await user!.getIdToken();
            return fetcher(url, token);
        },
        {
            dedupingInterval: 60000,
            revalidateOnFocus: false,
        }
    );

    return {
        settings: data,
        loading: isLoading,
        error: error,
        mutate,
    };
}
