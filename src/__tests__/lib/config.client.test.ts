import {
  getBaseUrl,
  getResumeUrl,
  getDashboardUrl,
  getOnboardingUrl,
  getEmailBaseUrl,
  getVerificationRoute,
  getVerificationUrl,
  ENABLE_SEEDING_AND_DEBUG_LISTS,
  SEEDING_PLAN_LIMITS,
  GLOBAL_LIVE_SEED_MONTHLY_LIMIT,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
  DEV_ROLE_OVERRIDE,
  getDevModeStatus,
  RESUME_CREATION_LIMITS,
  RESUME_EDITING_ALLOWED,
  RESUME_RETENTION_DAYS,
  RESUME_DELETION_GRACE_DAYS,
  RESUME_EXPIRY_WARNING_HOURS,
  RECRUITER_CONTACT_LIMITS,
  RECRUITER_SEARCH_LIMITS,
} from "../../lib/config.client";

describe("Client Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getBaseUrl", () => {
    it("should return localhost in development", () => {
      (process.env as any).NODE_ENV = "development";
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should use NEXT_PUBLIC_BASE_URL when set", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://custom-domain.com";
      expect(getBaseUrl()).toBe("https://custom-domain.com");
    });

    it("should use VERCEL_URL in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_VERCEL_URL = "vercel-app.vercel.app";

      jest.resetModules();
      const { getBaseUrl } = require("../../lib/config.client");

      expect(getBaseUrl()).toBe("vercel-app.vercel.app");
    });

    it("should handle server-side rendering", () => {
      // JSDOM's window is non-configurable; NEXT_PUBLIC_BASE_URL is checked first
      // in both client-side and server-side branches of getBaseUrl()
      process.env.NEXT_PUBLIC_BASE_URL = "https://server-url.com";
      expect(getBaseUrl()).toBe("https://server-url.com");
    });
  });

  describe("URL builders", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://test.com";
    });

    it("should build resume URL correctly", () => {
      expect(getResumeUrl(123)).toBe("https://test.com/resumes/123");
      expect(getResumeUrl("abc")).toBe("https://test.com/resumes/abc");
    });

    it("should build dashboard URL correctly", () => {
      expect(getDashboardUrl()).toBe("https://test.com/dashboard");
    });

    it("should build onboarding URL correctly", () => {
      expect(getOnboardingUrl()).toBe("https://test.com/onboarding");
    });
  });

  describe("getEmailBaseUrl", () => {
    it("should return localhost in development", () => {
      (process.env as any).NODE_ENV = "development";
      expect(getEmailBaseUrl()).toBe("http://localhost:3000");
    });

    it("should return production domain in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_VERCEL_URL = "prod-app.vercel.app";
      expect(getEmailBaseUrl()).toBe("prod-app.vercel.app");
    });

    it("should fallback to switchcv.com in production", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      delete process.env.NEXT_PUBLIC_BASE_URL;
      expect(getEmailBaseUrl()).toBe("https://switchcv.com");
    });
  });

  describe("Verification URLs", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://test.com";
    });

    it("should return default verification route", () => {
      expect(getVerificationRoute()).toBe("/auth?mode=verify-email");
    });

    it("should use custom verification route when set", () => {
      process.env.NEXT_PUBLIC_AUTH_VERIFICATION_PATH = "/custom-verify";
      expect(getVerificationRoute()).toBe("/custom-verify");
    });

    it("should build verification URL correctly", () => {
      expect(getVerificationUrl()).toBe(
        "https://test.com/auth?mode=verify-email",
      );
    });

    it("should use explicit verification URL when set", () => {
      process.env.NEXT_PUBLIC_AUTH_VERIFICATION_URL =
        "https://custom-verify.com/verify";
      expect(getVerificationUrl()).toBe("https://custom-verify.com/verify");
    });

    it("should handle custom origin", () => {
      expect(getVerificationUrl("https://custom-origin.com")).toBe(
        "https://custom-origin.com/auth?mode=verify-email",
      );
    });
  });

  describe("Feature Flags", () => {
    it("should disable seeding in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_ENABLE_SEEDING_DEBUG = "true";
      expect(ENABLE_SEEDING_AND_DEBUG_LISTS).toBe(false);
    });

    it("should enable seeding in development when explicitly set", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.NEXT_PUBLIC_ENABLE_SEEDING_DEBUG = "true";

      jest.resetModules();
      const {
        ENABLE_SEEDING_AND_DEBUG_LISTS,
      } = require("../../lib/config.client");

      expect(ENABLE_SEEDING_AND_DEBUG_LISTS).toBe(true);
    });

    it("should disable seeding when not set", () => {
      (process.env as any).NODE_ENV = "development";
      delete process.env.NEXT_PUBLIC_ENABLE_SEEDING_DEBUG;
      expect(ENABLE_SEEDING_AND_DEBUG_LISTS).toBe(false);
    });
  });

  describe("Seeding Plan Limits", () => {
    it("should use default values when env vars not set", () => {
      expect(SEEDING_PLAN_LIMITS.basic.monthlyWrites).toBe(5);
      expect(SEEDING_PLAN_LIMITS.premium.monthlyWrites).toBe(50);
      expect(SEEDING_PLAN_LIMITS.enterprise.monthlyWrites).toBe(200);
    });

    it("should parse environment variables correctly", () => {
      process.env.SEED_BASIC_MONTHLY_LIMIT = "10";
      process.env.SEED_PREMIUM_MONTHLY_LIMIT = "100";
      process.env.SEED_ENTERPRISE_MONTHLY_LIMIT = "500";

      // Need to re-import to pick up env changes
      jest.resetModules();
      const {
        SEEDING_PLAN_LIMITS: limits,
      } = require("../../lib/config.client");

      expect(limits.basic.monthlyWrites).toBe(10);
      expect(limits.premium.monthlyWrites).toBe(100);
      expect(limits.enterprise.monthlyWrites).toBe(500);
    });

    it("should fallback to defaults for invalid values", () => {
      process.env.SEED_BASIC_MONTHLY_LIMIT = "invalid";

      jest.resetModules();
      const {
        SEEDING_PLAN_LIMITS: limits,
      } = require("../../lib/config.client");

      expect(limits.basic.monthlyWrites).toBe(5); // default
    });

    it("should have correct strategies", () => {
      expect(SEEDING_PLAN_LIMITS.basic.strategy).toBe("template");
      expect(SEEDING_PLAN_LIMITS.premium.strategy).toBe("live");
      expect(SEEDING_PLAN_LIMITS.enterprise.strategy).toBe("live");
    });
  });

  describe("Global Live Seed Limit", () => {
    it("should use default value", () => {
      expect(GLOBAL_LIVE_SEED_MONTHLY_LIMIT).toBe(3000);
    });

    it("should parse environment variable", () => {
      process.env.SEED_GLOBAL_LIVE_MONTHLY_LIMIT = "5000";

      jest.resetModules();
      const {
        GLOBAL_LIVE_SEED_MONTHLY_LIMIT: limit,
      } = require("../../lib/config.client");

      expect(limit).toBe(5000);
    });
  });

  describe("Dev Mode", () => {
    it("should disable dev mode in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_DEV_MODE = "true";

      jest.resetModules();
      const { DEV_MODE_ENABLED: enabled } = require("../../lib/config.client");

      expect(enabled).toBe(false);
    });

    it("should enable dev mode in development when set", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.NEXT_PUBLIC_DEV_MODE = "true";

      jest.resetModules();
      const { DEV_MODE_ENABLED: enabled } = require("../../lib/config.client");

      expect(enabled).toBe(true);
    });

    it("should disable dev mode when not explicitly set", () => {
      (process.env as any).NODE_ENV = "development";
      delete process.env.NEXT_PUBLIC_DEV_MODE;

      jest.resetModules();
      const { DEV_MODE_ENABLED: enabled } = require("../../lib/config.client");

      expect(enabled).toBe(false);
    });
  });

  describe("Dev Mode Overrides", () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = "development";
      process.env.NEXT_PUBLIC_DEV_MODE = "true";
    });

    it("should return undefined tier override when not set", () => {
      jest.resetModules();
      const { DEV_TIER_OVERRIDE: tier } = require("../../lib/config.client");

      expect(tier).toBeUndefined();
    });

    it("should return valid tier override", () => {
      process.env.NEXT_PUBLIC_DEV_TIER = "premium";

      jest.resetModules();
      const { DEV_TIER_OVERRIDE: tier } = require("../../lib/config.client");

      expect(tier).toBe("premium");
    });

    it("should ignore invalid tier override", () => {
      process.env.NEXT_PUBLIC_DEV_TIER = "invalid";

      jest.resetModules();
      const { DEV_TIER_OVERRIDE: tier } = require("../../lib/config.client");

      expect(tier).toBeUndefined();
    });

    it("should return valid role override", () => {
      process.env.NEXT_PUBLIC_DEV_ROLE = "recruiter";

      jest.resetModules();
      const { DEV_ROLE_OVERRIDE: role } = require("../../lib/config.client");

      expect(role).toBe("recruiter");
    });

    it("should ignore invalid role override", () => {
      process.env.NEXT_PUBLIC_DEV_ROLE = "invalid";

      jest.resetModules();
      const { DEV_ROLE_OVERRIDE: role } = require("../../lib/config.client");

      expect(role).toBeUndefined();
    });
  });

  describe("getDevModeStatus", () => {
    it("should return dev mode status", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.NEXT_PUBLIC_DEV_MODE = "true";
      process.env.NEXT_PUBLIC_DEV_TIER = "enterprise";
      process.env.NEXT_PUBLIC_DEV_ROLE = "admin";

      jest.resetModules();
      const { getDevModeStatus } = require("../../lib/config.client");

      const status = getDevModeStatus();

      expect(status.enabled).toBe(true);
      expect(status.tierOverride).toBe("enterprise");
      expect(status.roleOverride).toBe("admin");
    });
  });

  describe("Legacy Constants", () => {
    it("should have correct resume creation limits", () => {
      expect(RESUME_CREATION_LIMITS.basic).toBe(1);
      expect(RESUME_CREATION_LIMITS.premium).toBe(50);
      expect(RESUME_CREATION_LIMITS.enterprise).toBe(9999);
    });

    it("should have correct resume editing permissions", () => {
      expect(RESUME_EDITING_ALLOWED.basic).toBe(false);
      expect(RESUME_EDITING_ALLOWED.premium).toBe(true);
      expect(RESUME_EDITING_ALLOWED.enterprise).toBe(true);
    });

    it("should have correct retention days", () => {
      expect(RESUME_RETENTION_DAYS.basic).toBe(7);
      expect(RESUME_RETENTION_DAYS.premium).toBeNull();
      expect(RESUME_RETENTION_DAYS.enterprise).toBeNull();
    });

    it("should have correct deletion grace days", () => {
      expect(RESUME_DELETION_GRACE_DAYS.basic).toBe(3);
      expect(RESUME_DELETION_GRACE_DAYS.premium).toBeNull();
      expect(RESUME_DELETION_GRACE_DAYS.enterprise).toBeNull();
    });

    it("should have correct expiry warning hours", () => {
      expect(RESUME_EXPIRY_WARNING_HOURS.basic).toBe(72);
      expect(RESUME_EXPIRY_WARNING_HOURS.premium).toBeNull();
      expect(RESUME_EXPIRY_WARNING_HOURS.enterprise).toBeNull();
    });

    it("should have correct recruiter contact limits", () => {
      expect(RECRUITER_CONTACT_LIMITS.basic).toEqual({
        amount: 2,
        interval: "lifetime",
      });
      expect(RECRUITER_CONTACT_LIMITS.premium).toEqual({
        amount: 50,
        interval: "month",
      });
      expect(RECRUITER_CONTACT_LIMITS.enterprise).toEqual({
        amount: 9999,
        interval: "month",
      });
    });

    it("should have correct recruiter search limits", () => {
      expect(RECRUITER_SEARCH_LIMITS.basic).toBe(2);
      expect(RECRUITER_SEARCH_LIMITS.premium).toBe(9999);
      expect(RECRUITER_SEARCH_LIMITS.enterprise).toBe(9999);
    });
  });
});
