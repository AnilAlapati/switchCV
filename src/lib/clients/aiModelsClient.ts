import type { SelectableModel, UserTier } from "@/types/ai";
import { apiClient } from "@/lib/apiClient";

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

/**
 * Client-safe helper to fetch selectable AI models with strong typing.
 */
export const fetchSelectableModels = async ({
  userTier,
  signal,
  baseUrl,
}: FetchSelectableModelsOptions): Promise<SelectableModel[]> => {
  const endpoint = "/api/ai/models";
  const params = { tier: userTier };

  // If baseUrl is provided, we might need to construct the full URL manually
  // or just rely on apiClient if baseUrl matches the app's base.
  // For now, let's assume apiClient handles the relative path correctly.
  // If baseUrl is strictly needed (e.g. SSR), apiClient might need adjustment or we pass full URL.

  let url = endpoint;
  if (baseUrl) {
    const urlObj = new URL(baseUrl);
    urlObj.pathname = endpoint;
    url = urlObj.toString();
  }

  const payload = await apiClient<SelectableModelsResponse>(url, {
    signal,
    params,
  });

  return payload.models;
};
