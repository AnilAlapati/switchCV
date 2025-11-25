/**
 * Tests for lib/config utility
 */

import {
  getBaseUrl,
  getResumeUrl,
  getDashboardUrl,
  getOnboardingUrl,
  getEmailBaseUrl,
} from "@/lib/config";

describe("Config Utility", () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    // Remove window from global
    (global as any).window = undefined;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    (global as any).window = originalWindow;
  });

  describe("getBaseUrl", () => {
    it("should return NEXT_PUBLIC_BASE_URL when window is defined (client-side)", () => {
      (global as any).window = {};
      process.env.NEXT_PUBLIC_BASE_URL = "https://custom-domain.com";

      expect(getBaseUrl()).toBe("https://custom-domain.com");
    });

    it("should return NEXT_PUBLIC_VERCEL_URL when window is defined and BASE_URL is not set", () => {
      (global as any).window = {};
      process.env.NEXT_PUBLIC_VERCEL_URL = "https://vercel-app.vercel.app";
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getBaseUrl()).toBe("https://vercel-app.vercel.app");
    });

    it("should return localhost when window is defined and no env vars set", () => {
      (global as any).window = {};
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;

      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should return NEXT_PUBLIC_BASE_URL on server-side", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://server-domain.com";

      expect(getBaseUrl()).toBe("https://server-domain.com");
    });

    it("should return VERCEL_URL on server-side when BASE_URL is not set", () => {
      process.env.NEXT_PUBLIC_VERCEL_URL = "https://server-vercel.vercel.app";
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getBaseUrl()).toBe("https://server-vercel.vercel.app");
    });

    it("should return localhost on server-side when no env vars set", () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.VERCEL_URL;

      expect(getBaseUrl()).toBe("http://localhost:3000");
    });
  });

  describe("getResumeUrl", () => {
    it("should construct resume URL with numeric ID", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://app.com";

      expect(getResumeUrl(123)).toBe("https://app.com/resumes/123");
    });

    it("should construct resume URL with string ID", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://app.com";

      expect(getResumeUrl("abc-123")).toBe("https://app.com/resumes/abc-123");
    });

    it("should use default localhost when no BASE_URL set", () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getResumeUrl(456)).toBe("http://localhost:3000/resumes/456");
    });
  });

  describe("getDashboardUrl", () => {
    it("should construct dashboard URL", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://app.com";

      expect(getDashboardUrl()).toBe("https://app.com/dashboard");
    });

    it("should use default localhost when no BASE_URL set", () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getDashboardUrl()).toBe("http://localhost:3000/dashboard");
    });
  });

  describe("getOnboardingUrl", () => {
    it("should construct onboarding URL", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://app.com";

      expect(getOnboardingUrl()).toBe("https://app.com/onboarding");
    });

    it("should use default localhost when no BASE_URL set", () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getOnboardingUrl()).toBe("http://localhost:3000/onboarding");
    });
  });

  describe("getEmailBaseUrl", () => {
    it("should return NEXT_PUBLIC_BASE_URL in development", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
      });
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3001";

      expect(getEmailBaseUrl()).toBe("http://localhost:3001");
    });

    it("should return localhost in development when BASE_URL not set", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
      });
      delete process.env.NEXT_PUBLIC_BASE_URL;

      expect(getEmailBaseUrl()).toBe("http://localhost:3000");
    });

    it("should return NEXT_PUBLIC_VERCEL_URL in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
      });
      process.env.NEXT_PUBLIC_VERCEL_URL = "https://prod-app.vercel.app";

      expect(getEmailBaseUrl()).toBe("https://prod-app.vercel.app");
    });

    it("should return NEXT_PUBLIC_BASE_URL in production when VERCEL_URL not set", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
      });
      process.env.NEXT_PUBLIC_BASE_URL = "https://prod-domain.com";
      delete process.env.NEXT_PUBLIC_VERCEL_URL;

      expect(getEmailBaseUrl()).toBe("https://prod-domain.com");
    });

    it("should return switchcv.com in production when no env vars set", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
      });
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;

      expect(getEmailBaseUrl()).toBe("https://switchcv.com");
    });

    it("should default to development when NODE_ENV not set", () => {
      delete (process.env as any).NODE_ENV;
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3002";

      expect(getEmailBaseUrl()).toBe("http://localhost:3002");
    });
  });
});
