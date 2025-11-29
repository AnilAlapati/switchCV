import type { SelectableModel, UserTier } from "@/types/ai";

interface FetchSelectableModelsOptions {
  /** User tier to request server-allowed models for */
  userTier: UserTier;
  /** Optional AbortSignal for React Query/SWR callers */
  signal?: AbortSignal;
  /** Optional absolute base URL (falls back to relative fetch) */
  baseUrl?: string;
}

interface SelectableModelsResponse {
  models: SelectableModel[];
}

const buildEndpoint = (userTier: UserTier, baseUrl?: string): string => {
  const path = `/api/ai/models?tier=${encodeURIComponent(userTier)}`;
  if (!baseUrl) {
    return path;
  }
  const url = new URL(baseUrl);
  url.pathname = "/api/ai/models";
  url.search = `tier=${encodeURIComponent(userTier)}`;
  return url.toString();
};

/**
 * Client-safe helper to fetch selectable AI models with strong typing.
 */
export const fetchSelectableModels = async ({
  userTier,
  signal,
  baseUrl,
}: FetchSelectableModelsOptions): Promise<SelectableModel[]> => {
  const response = await fetch(buildEndpoint(userTier, baseUrl), {
    method: "GET",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load AI models (status ${response.status})`);
  }

  const payload = (await response.json()) as SelectableModelsResponse;
  return payload.models;
};
