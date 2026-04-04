/**
 * Middleware Security Test Suite
 *
 * Tests CSRF origin validation, CSP header generation, and rate limiting
 * enforcement in the Edge middleware.
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Helper to create a NextRequest with specific headers
function makeRequest(
  path: string,
  options: {
    method?: string;
    origin?: string;
    referer?: string;
    authorization?: string;
    ip?: string;
  } = {},
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (options.origin) headers.set("origin", options.origin);
  if (options.referer) headers.set("referer", options.referer);
  if (options.authorization)
    headers.set("authorization", options.authorization);
  if (options.ip) headers.set("x-forwarded-for", options.ip);

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
  });
}

describe("Middleware Security", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Ensure test environment allows localhost origins
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  // =========================================================================
  // CSRF Origin Validation
  // =========================================================================
  describe("CSRF Origin Validation", () => {
    it("should reject POST to protected API with no origin, referer, or bearer token", () => {
      const req = makeRequest("/api/user/settings", { method: "POST" });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).toBe(403);
    });

    it("should reject POST with disallowed origin", () => {
      const req = makeRequest("/api/user/settings", {
        method: "POST",
        origin: "https://evil-site.com",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).toBe(403);
    });

    it("should allow POST with valid localhost origin in test", () => {
      const req = makeRequest("/api/user/settings", {
        method: "POST",
        origin: "http://localhost:3000",
      });
      const res = middleware(req);

      // Should pass CSRF — returns NextResponse.next() (status 200)
      expect(res).toBeDefined();
      expect(res!.status).not.toBe(403);
    });

    it("should allow POST with valid referer when origin missing", () => {
      const req = makeRequest("/api/user/settings", {
        method: "POST",
        referer: "http://localhost:3000/dashboard",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).not.toBe(403);
    });

    it("should allow POST with Bearer token and no origin/referer", () => {
      const req = makeRequest("/api/user/settings", {
        method: "POST",
        authorization: "Bearer some-valid-token",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).not.toBe(403);
    });

    it("should skip CSRF for GET requests", () => {
      const req = makeRequest("/api/user/settings", { method: "GET" });
      const res = middleware(req);

      expect(res).toBeDefined();
      // GET is safe method — no CSRF check, should pass through
      expect(res!.status).not.toBe(403);
    });

    it("should skip CSRF for exempt paths", () => {
      // /api/health is CSRF-exempt
      const req = makeRequest("/api/health", { method: "POST" });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).not.toBe(403);
    });

    it("should skip CSRF for auth endpoints", () => {
      const req = makeRequest("/api/auth/login", { method: "POST" });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).not.toBe(403);
    });

    it("should reject PUT with disallowed origin", () => {
      const req = makeRequest("/api/resume/update", {
        method: "PUT",
        origin: "https://attacker.com",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).toBe(403);
    });

    it("should reject DELETE with no credentials", () => {
      const req = makeRequest("/api/resume/123", { method: "DELETE" });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).toBe(403);
    });

    it("should reject PATCH with disallowed referer", () => {
      const req = makeRequest("/api/user/settings", {
        method: "PATCH",
        referer: "https://evil.com/fake",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).toBe(403);
    });
  });

  // =========================================================================
  // CSP Header Generation
  // =========================================================================
  describe("CSP Headers", () => {
    it("should set Content-Security-Policy header on API responses", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      expect(res).toBeDefined();
      const csp = res!.headers.get("Content-Security-Policy");
      expect(csp).toBeTruthy();
    });

    it("should include nonce in script-src", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    });

    it("should include strict-dynamic in script-src", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      expect(csp).toContain("'strict-dynamic'");
    });

    it("should NOT include bare https: or http: in script-src", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      // Extract the script-src directive
      const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || "";
      // Should not have bare protocol sources (they undermine strict-dynamic)
      expect(scriptSrc).not.toMatch(/\bhttps:\b/);
      expect(scriptSrc).not.toMatch(/\bhttp:\b/);
    });

    it("should block object-src", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      expect(csp).toContain("object-src 'none'");
    });

    it("should set frame-ancestors to none", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should set base-uri to self", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      const csp = res!.headers.get("Content-Security-Policy")!;
      expect(csp).toContain("base-uri 'self'");
    });

    it("should set x-request-id header", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      expect(res!.headers.get("x-request-id")).toBeTruthy();
    });

    it("should set x-nonce header", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      expect(res!.headers.get("x-nonce")).toBeTruthy();
    });

    it("should set CSP on non-API pages too", () => {
      const req = makeRequest("/dashboard", { method: "GET" });
      const res = middleware(req);

      expect(res).toBeDefined();
      const csp = res!.headers.get("Content-Security-Policy");
      expect(csp).toBeTruthy();
    });
  });

  // =========================================================================
  // Rate Limiting
  // =========================================================================
  describe("Rate Limiting", () => {
    it("should allow requests under the rate limit", () => {
      const req = makeRequest("/api/some-endpoint", {
        method: "GET",
        ip: "rate-test-under-limit",
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res!.status).not.toBe(429);
    });

    it("should return 429 when rate limit is exceeded for auth routes", () => {
      const ip = `rate-test-auth-${Date.now()}`;
      let lastRes;

      // Auth routes have limit of 5 per 60s
      for (let i = 0; i < 7; i++) {
        const req = makeRequest("/api/auth/login", {
          method: "POST",
          origin: "http://localhost:3000",
          ip,
        });
        lastRes = middleware(req);
      }

      expect(lastRes).toBeDefined();
      expect(lastRes!.status).toBe(429);
    });

    it("should include Retry-After header on 429 response", async () => {
      const ip = `rate-test-retry-${Date.now()}`;

      // Exhaust auth limit (5 requests)
      for (let i = 0; i < 6; i++) {
        const req = makeRequest("/api/auth/signup", {
          method: "POST",
          origin: "http://localhost:3000",
          ip,
        });
        middleware(req);
      }

      // This should be rate limited
      const req = makeRequest("/api/auth/signup", {
        method: "POST",
        origin: "http://localhost:3000",
        ip,
      });
      const res = middleware(req);

      expect(res!.status).toBe(429);
      expect(res!.headers.get("Retry-After")).toBeTruthy();
    });

    it("should skip rate limiting for exempt paths", () => {
      const ip = `rate-test-exempt-${Date.now()}`;

      // /api/system-config is rate-limit exempt
      for (let i = 0; i < 200; i++) {
        const req = makeRequest("/api/system-config", {
          method: "GET",
          ip,
        });
        const res = middleware(req);
        expect(res!.status).not.toBe(429);
      }
    });

    it("should use different rate limits per path tier", () => {
      const ip = `rate-test-tiers-${Date.now()}`;

      // AI routes have limit of 10 per 60s. Send 11 requests.
      let aiLimited = false;
      for (let i = 0; i < 12; i++) {
        const req = makeRequest("/api/ai/generate", {
          method: "POST",
          origin: "http://localhost:3000",
          ip,
        });
        const res = middleware(req);
        if (res!.status === 429) {
          aiLimited = true;
          break;
        }
      }
      expect(aiLimited).toBe(true);
    });

    it("should return RATE_LIMIT_EXCEEDED error code in 429 body", async () => {
      const ip = `rate-test-code-${Date.now()}`;

      // Exhaust auth limit
      for (let i = 0; i < 6; i++) {
        middleware(
          makeRequest("/api/auth/verify", {
            method: "POST",
            origin: "http://localhost:3000",
            ip,
          }),
        );
      }

      const res = middleware(
        makeRequest("/api/auth/verify", {
          method: "POST",
          origin: "http://localhost:3000",
          ip,
        }),
      );

      expect(res!.status).toBe(429);
      const body = await res!.json();
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  // =========================================================================
  // Security Headers
  // =========================================================================
  describe("Security Headers", () => {
    it("should remove x-powered-by header", () => {
      const req = makeRequest("/api/health", { method: "GET" });
      const res = middleware(req);

      expect(res!.headers.get("x-powered-by")).toBeNull();
    });
  });
});
