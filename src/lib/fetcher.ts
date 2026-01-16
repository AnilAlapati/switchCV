import { apiClient } from "./apiClient";

export const fetcher = <T>(url: string) => apiClient<T>(url);
