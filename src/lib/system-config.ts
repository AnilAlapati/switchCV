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
});
