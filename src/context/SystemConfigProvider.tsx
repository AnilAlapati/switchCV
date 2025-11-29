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
import type { JSX } from "react";
import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";

const CONFIG_CACHE_KEY = "switchcv:system-config";
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 60 * 1000; // Re-fetch every minute for freshness

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
};

const readCachedConfig = (): SystemConfig | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedConfigPayload;
    if (cached.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(CONFIG_CACHE_KEY);
      return null;
    }

    return cached.data;
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _error
  ) {
    return null;
  }
};

const writeCachedConfig = (config: SystemConfig): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: CachedConfigPayload = {
      data: config,
      expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    };

    window.sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(payload));
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _error
  ) {
    // Swallow caching errors to avoid breaking rendering.
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
}): JSX.Element => {
  const [config, setConfig] = useState<SystemConfig>(() => {
    const cached = readCachedConfig();
    return cached ?? defaultSystemConfig;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<SystemConfig> => {
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
      }

      const remote = await refresh();
      setConfig(remote);

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
