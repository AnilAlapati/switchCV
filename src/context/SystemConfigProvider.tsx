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
  doc,
  getDoc,
  onSnapshot,
  type DocumentReference,
} from "firebase/firestore";
import { db, firebaseStatus } from "@/lib/firebase";

const CONFIG_CACHE_KEY = "switchcv:system-config";
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type MaintenanceConfig = {
  isActive: boolean;
  message: string;
  blocking: boolean;
};

export type AuthConfig = {
  registrationClosed: boolean;
  loginDisabled: boolean;
};

export type FeaturesConfig = {
  enableAnalytics: boolean;
  enableMockData: boolean;
};

export type SystemConfig = {
  maintenance: MaintenanceConfig;
  auth: AuthConfig;
  features: FeaturesConfig;
};

const defaultConfig: SystemConfig = {
  maintenance: {
    isActive: false,
    message: "",
    blocking: false,
  },
  auth: {
    registrationClosed: false,
    loginDisabled: false,
  },
  features: {
    enableAnalytics: true,
    enableMockData: false,
  },
};

type SystemConfigContextValue = {
  config: SystemConfig;
  loading: boolean;
  refresh: () => Promise<SystemConfig>;
};

const SystemConfigContext = createContext<SystemConfigContextValue | null>(
  null
);

const getConfigDocRef = (): DocumentReference => doc(db, "config", "system");

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

const mergeWithDefaults = (partial?: Partial<SystemConfig>): SystemConfig => ({
  maintenance: {
    ...defaultConfig.maintenance,
    ...(partial?.maintenance ?? {}),
  },
  auth: {
    ...defaultConfig.auth,
    ...(partial?.auth ?? {}),
  },
  features: {
    ...defaultConfig.features,
    ...(partial?.features ?? {}),
  },
});

const fetchRemoteConfig = async (): Promise<SystemConfig> => {
  if (!firebaseStatus.isReady) {
    return defaultConfig;
  }

  try {
    const snapshot = await getDoc(getConfigDocRef());
    if (!snapshot.exists()) {
      return defaultConfig;
    }

    return mergeWithDefaults(snapshot.data() as Partial<SystemConfig>);
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _error
  ) {
    return defaultConfig;
  }
};

export const SystemConfigProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [config, setConfig] = useState<SystemConfig>(() => {
    const cached = readCachedConfig();
    return cached ?? defaultConfig;
  });
  const [loading, setLoading] = useState<boolean>(firebaseStatus.isReady);

  const refresh = useCallback(async (): Promise<SystemConfig> => {
    const nextConfig = await fetchRemoteConfig();
    setConfig(nextConfig);
    writeCachedConfig(nextConfig);
    setLoading(false);
    return nextConfig;
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!firebaseStatus.isReady) {
      return () => undefined;
    }

    const bootstrap = async () => {
      const cached = readCachedConfig();
      if (cached) {
        setConfig(cached);
        setLoading(false);
      }

      const remote = await refresh();
      setConfig(remote);

      unsubscribe = onSnapshot(getConfigDocRef(), (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const latest = mergeWithDefaults(
          snapshot.data() as Partial<SystemConfig>
        );
        setConfig((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(latest)) {
            return prev;
          }
          writeCachedConfig(latest);
          return latest;
        });
      });
    };

    void bootstrap();

    return () => {
      unsubscribe?.();
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
