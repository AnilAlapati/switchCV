"use client";

import useSWR from "swr";
import { RecruiterSearchFilters, SearchResult } from "@/components/recruiter/SearchInterface";

interface SearchApiResponse {
    results: SearchResult[];
    count: number;
    query: string;
}

const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Search failed");
    }
    return response.json();
};

export function useRecruiterSearch(filters: RecruiterSearchFilters | null) {
    const shouldFetch = !!filters?.query;

    const params = new URLSearchParams();
    if (shouldFetch && filters) {
        if (filters.query) params.append("q", filters.query);
        if (filters.location) params.append("location", filters.location);
        if (filters.skills && filters.skills.length > 0) params.append("skills", filters.skills.join(","));
        if (filters.targetRole) params.append("targetRole", filters.targetRole);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
    }

    const queryString = params.toString();
    const key = shouldFetch ? `/api/recruiter/search?${queryString}` : null;

    const { data, error, isLoading } = useSWR<SearchApiResponse>(
        key,
        fetcher,
        {
            dedupingInterval: 60000, // 1 minute cache for search results
            revalidateOnFocus: false,
            keepPreviousData: true, // Keep showing previous results while fetching new ones
        }
    );

    return {
        results: data?.results || [],
        count: data?.count || 0,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Search failed") : null,
    };
}
