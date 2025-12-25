"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";

const CONFIG_CACHE_KEY = "switchcv:system-config";

// Environment-aware polling: Dev = 1 hour, Prod = 1 minute
const POLL_INTERVAL_MS =
  process.env.NODE_ENV === "development"
    ? 60 * 60 * 1000 // 1 hour for dev (24 calls/day)
    : 60 * 1000; // 1 minute for prod (1,440 calls/day)

type SystemConfigContextValue = {
  config: SystemConfig;
  loading: boolean;
  refresh: () => Promise<SystemConfig>;
};

const SystemConfigContext = createContext<SystemConfigContextValue | null>(
  null
);

type CachedConfigPayload = {
  data: SystemConfig;
  expiresAt: number;
  ttlMs: number;
};

const getCacheStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getCacheTtlMs = (config?: SystemConfig): number =>
  config?.cache?.systemConfigTtlMs ??
  defaultSystemConfig.cache.systemConfigTtlMs;

const readCachedConfig = (): SystemConfig | null => {
  const storage = getCacheStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(CONFIG_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedConfigPayload;
    if (cached.expiresAt <= Date.now()) {
      storage.removeItem(CONFIG_CACHE_KEY);
      return null;
    }

    return mergeWithDefaultConfig(cached.data);
  } catch {
    return null;
  }
};

const writeCachedConfig = (config: SystemConfig): void => {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  try {
    const ttlMs = getCacheTtlMs(config);
    const payload: CachedConfigPayload = {
      data: config,
      ttlMs,
      expiresAt: Date.now() + ttlMs,
    };

    storage.setItem(CONFIG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures (e.g., storage quota exceeded)
  }
};

const fetchRemoteConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await fetch("/api/system-config", {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch system config: ${response.status}`);
    }

    const payload = (await response.json()) as {
      config?: Partial<SystemConfig>;
    };
    return mergeWithDefaultConfig(payload.config);
  } catch (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _error
  ) {
    return defaultSystemConfig;
  }
};

export const SystemConfigProvider = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const [config, setConfig] = useState<SystemConfig>(() => {
    const cached = readCachedConfig();
    return cached ?? defaultSystemConfig;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<SystemConfig> => {
    setLoading(true);
    const nextConfig = await fetchRemoteConfig();
    setConfig(nextConfig);
    writeCachedConfig(nextConfig);
    setLoading(false);
    return nextConfig;
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const bootstrap = async () => {
      const cached = readCachedConfig();
      if (cached) {
        setConfig(cached);
        setLoading(false);
      } else {
        // Only stay in loading state if no cache is available.
        // This prevents the "flash of loading" if we already have data.
        setLoading(true);
      }

      const remote = await refresh();
      setConfig(remote);
      setLoading(false); // Ensure loading is false after remote fetch

      interval = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    };

    void bootstrap();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CONFIG_CACHE_KEY || !event.newValue) {
        return;
      }

      try {
        const cached = JSON.parse(event.newValue) as CachedConfigPayload;
        if (cached.expiresAt <= Date.now()) {
          return;
        }
        const next = mergeWithDefaultConfig(cached.data);
        setConfig(next);
        setLoading(false);
      } catch {
        // ignore malformed payloads
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo<SystemConfigContextValue>(
    () => ({
      config,
      loading,
      refresh,
    }),
    [config, loading, refresh]
  );

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = (): SystemConfigContextValue => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error("useSystemConfig must be used within SystemConfigProvider");
  }
  return context;
};
