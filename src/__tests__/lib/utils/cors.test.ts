/**
 * CORS Validation Tests
 *
 * Tests for CORS origin validation and header generation
 */

import { NextRequest } from "next/server";
import {
  validateCorsOrigin,
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/utils/cors";

describe("CORS Validation", () => {
  describe("validateCorsOrigin", () => {
    it("should allow localhost in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const result = validateCorsOrigin(request);

      expect(result.allowed).toBe(true);
      expect(result.origin).toBe("http://localhost:3000");

      process.env.NODE_ENV = originalEnv;
    });

    it("should allow localhost with different port in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://localhost:3001",
        },
      });

      const result = validateCorsOrigin(request);

      expect(result.allowed).toBe(true);
      expect(result.origin).toBe("http://localhost:3001");

      process.env.NODE_ENV = originalEnv;
    });

    it("should reject unauthorized origins in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const request = new NextRequest("https://switchcv.com/api/test", {
        headers: {
          origin: "https://evil.com",
        },
      });

      const result = validateCorsOrigin(request);

      expect(result.allowed).toBe(false);
      expect(result.origin).toBe(null);
      expect(result.reason).toBe("Origin not allowed");

      process.env.NODE_ENV = originalEnv;
    });

    it("should allow production domains in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const request = new NextRequest("https://switchcv.com/api/test", {
        headers: {
          origin: "https://switchcv.com",
        },
      });

      const result = validateCorsOrigin(request);

      expect(result.allowed).toBe(true);
      expect(result.origin).toBe("https://switchcv.com");

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle requests without origin header", () => {
      const request = new NextRequest("http://localhost:3000/api/test");

      const result = validateCorsOrigin(request);

      // Should allow same-origin requests without origin header
      expect(result.allowed).toBe(true);
      expect(result.origin).toBe(null);
    });

    it("should check referer as fallback when origin is missing", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          referer: "http://localhost:3000/dashboard",
        },
      });

      const result = validateCorsOrigin(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe("createCorsHeaders", () => {
    it("should create standard CORS headers in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const headers = createCorsHeaders(request);

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://localhost:3000"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
      expect(headers["Access-Control-Max-Age"]).toBe("86400");

      process.env.NODE_ENV = originalEnv;
    });

    it("should not include origin for invalid origins", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const request = new NextRequest("https://switchcv.com/api/test", {
        headers: {
          origin: "https://evil.com",
        },
      });

      const headers = createCorsHeaders(request);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should allow custom options", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const headers = createCorsHeaders(req, {
        allowCredentials: false,
        maxAge: 3600,
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
      });

      expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
      expect(headers["Access-Control-Max-Age"]).toBe("3600");
      expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST");
      expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("handleCorsPreflightRequest", () => {
    it("should return 204 for allowed origin in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = handleCorsPreflightRequest(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000"
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should return 403 for disallowed origin", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const request = new NextRequest("https://switchcv.com/api/test", {
        method: "OPTIONS",
        headers: {
          origin: "https://evil.com",
        },
      });

      const response = handleCorsPreflightRequest(request);

      expect(response.status).toBe(403);
      expect(response.statusText).toContain("Origin not allowed");

      process.env.NODE_ENV = originalEnv;
    });
  });
});
