import {
  getActiveConfig,
  createCustomConfig,
  DEFAULT_CONFIG,
  PRODUCTION_CONFIG,
} from "@/lib/services/conversationConfig";

describe("conversationConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getActiveConfig", () => {
    it("should use NODE_ENV if RESUME_MODE is not set", () => {
      delete process.env.RESUME_MODE;
      // NODE_ENV is 'test' by default in Jest
      expect(getActiveConfig()).toEqual(DEFAULT_CONFIG);
    });

    it("should default to development if nothing is set", () => {
      delete process.env.RESUME_MODE;
      // We try to mock NODE_ENV being undefined
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: undefined,
        writable: true,
      });

      expect(getActiveConfig()).toEqual(DEFAULT_CONFIG);

      // Restore
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalNodeEnv,
        writable: true,
      });
    });

    it("should use NODE_ENV=production if RESUME_MODE is not set", () => {
      delete process.env.RESUME_MODE;
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
      });

      expect(getActiveConfig()).toEqual(PRODUCTION_CONFIG);

      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalNodeEnv,
        writable: true,
      });
    });

    it("should return PRODUCTION_CONFIG if RESUME_MODE is production", () => {
      process.env.RESUME_MODE = "production";
      expect(getActiveConfig()).toEqual(PRODUCTION_CONFIG);
    });

    it("should return DEFAULT_CONFIG if RESUME_MODE is beta", () => {
      process.env.RESUME_MODE = "beta";
      expect(getActiveConfig()).toEqual(DEFAULT_CONFIG);
    });
  });

  describe("createCustomConfig", () => {
    it("should override default config with provided values", () => {
      const overrides = {
        maxBetaQuestions: 100,
        mode: "production" as const,
      };
      const config = createCustomConfig(overrides);
      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        ...overrides,
      });
    });
  });
});
