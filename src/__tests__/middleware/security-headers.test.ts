/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("middleware security headers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: "https://switchcv-e5136.web.app",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("adds CSP and tracing headers to page requests", () => {
    const request = new NextRequest(
      "https://switchcv-e5136.web.app/create-resume",
    );

    const response = middleware(request);

    expect(response).toBeDefined();
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response?.headers.get("x-request-id")).toBeTruthy();
    expect(response?.headers.get("x-nonce")).toBeTruthy();
    expect(response?.headers.get("x-powered-by")).toBeNull();
  });

  it("rejects invalid cross-site state-changing API requests and still returns security headers", async () => {
    const request = new NextRequest(
      "https://switchcv-e5136.web.app/api/user/profile",
      {
        method: "POST",
        headers: {
          origin: "https://evil.example",
        },
      },
    );

    const response = middleware(request);
    const body = await response?.json();

    expect(response?.status).toBe(403);
    expect(body).toEqual({
      error: "Request rejected",
      code: "CSRF_ORIGIN_MISMATCH",
    });
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(response?.headers.get("x-request-id")).toBeTruthy();
  });
});
