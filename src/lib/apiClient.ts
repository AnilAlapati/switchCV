import { getAuth } from "firebase/auth";

interface ApiClientOptions extends RequestInit {
  params?: Record<string, string>;
  token?: string;
  timeout?: number;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const apiClient = async <T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> => {
  const { params, token, headers, timeout, ...customConfig } = options;

  // Handle server-side rendering where window is undefined
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const url = new URL(`${BASE_URL}${endpoint}`, origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  } else {
    // specific logic to get token if not provided, e.g. from firebase
    // This is optional and depends on if we want implicit auth
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      defaultHeaders["Authorization"] = `Bearer ${idToken}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = timeout
    ? setTimeout(() => controller.abort(), timeout)
    : undefined;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    signal: options.signal || (timeout ? controller.signal : undefined),
  };

  try {
    const response = await fetch(url.toString(), config);

    if (!response.ok) {
      let errorMessage = "An error occurred while fetching data";
      let errorData = null;

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse error
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
