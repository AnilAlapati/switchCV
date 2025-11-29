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

const CACHE_TTL_MIN_MS = 10_000; // 10 seconds
const CACHE_TTL_MAX_MS = 30 * 60 * 1000; // 30 minutes

const getEnvCacheTtl = (): number | undefined => {
  const value = Number(process.env.NEXT_PUBLIC_SYSTEM_CONFIG_CACHE_TTL_MS);
  return Number.isFinite(value) ? value : undefined;
};

const clampCacheTtl = (value: number): number =>
  Math.min(Math.max(value, CACHE_TTL_MIN_MS), CACHE_TTL_MAX_MS);

const DEFAULT_CACHE_TTL_MS = (() => {
  const envOverride = getEnvCacheTtl();
  if (typeof envOverride === "number") {
    return clampCacheTtl(envOverride);
  }
  return clampCacheTtl(5 * 60 * 1000);
})();

export const normalizeCacheTtl = (value?: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_CACHE_TTL_MS;
  }
  return clampCacheTtl(value);
};

export type CacheConfig = {
  ttlMs: number;
};

export type SystemConfig = {
  maintenance: MaintenanceConfig;
  auth: AuthConfig;
  features: FeaturesConfig;
  cache: CacheConfig;
};

export const defaultSystemConfig: SystemConfig = {
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
  cache: {
    ttlMs: DEFAULT_CACHE_TTL_MS,
  },
};

export const mergeWithDefaultConfig = (
  partial?: Partial<SystemConfig>
): SystemConfig => ({
  maintenance: {
    ...defaultSystemConfig.maintenance,
    ...(partial?.maintenance ?? {}),
  },
  auth: {
    ...defaultSystemConfig.auth,
    ...(partial?.auth ?? {}),
  },
  features: {
    ...defaultSystemConfig.features,
    ...(partial?.features ?? {}),
  },
  cache: {
    ttlMs: normalizeCacheTtl(partial?.cache?.ttlMs),
  },
});
