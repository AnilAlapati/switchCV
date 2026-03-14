import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import type {
    AdminAiMonitoringQuery,
    AdminAiMonitoringResponse,
} from "@/types/aiMonitoring";

const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch AI monitoring stats");
    }
    return response.json();
};

export function useAiMonitoring(query: AdminAiMonitoringQuery = {}) {
    const { user } = useAuth();
    const { role } = useUserProfile();

    const shouldFetch = !!user && role === "admin";

    const searchParams = new URLSearchParams();
    if (query.requestId) searchParams.set("requestId", query.requestId);
    if (query.limit) searchParams.set("limit", query.limit);
    if (query.days) searchParams.set("days", query.days);
    if (query.stage) searchParams.set("stage", query.stage);
    if (query.failureCode) searchParams.set("failureCode", query.failureCode);
    if (query.provider) searchParams.set("provider", query.provider);
    if (query.model) searchParams.set("model", query.model);

    const queryString = searchParams.toString();
    const key = shouldFetch
        ? `/api/admin/ai-monitoring${queryString ? `?${queryString}` : ""}`
        : null;

    const { data, error, isLoading, mutate } = useSWR<AdminAiMonitoringResponse>(
        key,
        fetcher,
        {
            dedupingInterval: 30000,
            revalidateOnFocus: false,
        }
    );

    return {
        data,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Failed to load stats") : null,
        mutate,
    };
}
