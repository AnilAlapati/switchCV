import * as functions from "firebase-functions/v1";
import { ConfigLoader } from "../src/lib/configLoader";

// Mock firebase-functions
jest.mock("firebase-functions/v1", () => ({
  config: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock firebase-functions v2 logger
jest.mock("firebase-functions", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ConfigLoader", () => {
  beforeEach(() => {
    // Reset singleton instance
    (ConfigLoader as any).instance = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.USE_LEGACY_CONFIG;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MONITORING_P95_THRESHOLD_DEFAULT;
  });

  it("should use legacy config when USE_LEGACY_CONFIG is true", () => {
    process.env.USE_LEGACY_CONFIG = "true";

    const mockConfig = {
      smtp: {
        host: "legacy.smtp.com",
        port: 25,
        user: "legacy_user",
        pass: "legacy_pass",
      },
      monitoring: {
        p95_threshold_default: 500,
      },
    };
    (functions.config as jest.Mock).mockReturnValue(mockConfig);

    const loader = ConfigLoader.getInstance();
    const config = loader.getConfig();

    expect(loader.getMode()).toBe("legacy");
    expect(config.smtp?.host).toBe("legacy.smtp.com");
    expect(functions.config).toHaveBeenCalled();
  });

  it("should use env vars when USE_LEGACY_CONFIG is false", () => {
    process.env.USE_LEGACY_CONFIG = "false";
    process.env.SMTP_HOST = "env.smtp.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "env_user";
    process.env.SMTP_PASS = "env_pass_test";
    process.env.MONITORING_P95_THRESHOLD_DEFAULT = "1000";

    const loader = ConfigLoader.getInstance();
    const config = loader.getConfig();

    expect(loader.getMode()).toBe("new");
    expect(config.smtp?.host).toBe("env.smtp.com");
    expect(config.smtp?.port).toBe("587");
    expect(config.monitoring?.p95_threshold_default).toBe("1000");
    expect(functions.config).not.toHaveBeenCalled();
  });

  it("should fallback to empty config on error in legacy mode", () => {
    process.env.USE_LEGACY_CONFIG = "true";
    (functions.config as jest.Mock).mockImplementation(() => {
      throw new Error("Config error");
    });

    const loader = ConfigLoader.getInstance();
    const config = loader.getConfig();

    expect(config).toEqual({});
  });
});
