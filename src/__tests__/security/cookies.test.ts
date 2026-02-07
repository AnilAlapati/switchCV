/**
 * Cookie Security Test Suite
 *
 * Validates secure cookie configuration and management
 */

import { describe, it, expect } from "@jest/globals";
import { NextResponse } from "next/server";
import {
    COOKIE_CONFIG,
    setSecureCookie,
    deleteSecureCookie,
    validateCookieSecurity,
    getSecureCookie,
} from "../../lib/middleware/session";

const setNodeEnv = (value: string) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

describe("Cookie Security", () => {
    describe("COOKIE_CONFIG", () => {
        it("should use __Host- or __Secure- prefix for sensitive cookies", () => {
            expect(COOKIE_CONFIG.SESSION.name).toMatch(/^__(Host|Secure)-/);
            expect(COOKIE_CONFIG.AUTH_TOKEN.name).toMatch(/^__(Host|Secure)-/);
            expect(COOKIE_CONFIG.CSRF.name).toMatch(/^__(Host|Secure)-/);
        });

        it("should set httpOnly for sensitive cookies", () => {
            expect(COOKIE_CONFIG.SESSION.httpOnly).toBe(true);
            expect(COOKIE_CONFIG.AUTH_TOKEN.httpOnly).toBe(true);
        });

        it("should set secure flag for production", () => {
            expect(COOKIE_CONFIG.SESSION.secure).toBe(true);
            expect(COOKIE_CONFIG.CSRF.secure).toBe(true);
        });

        it("should use strict sameSite for session and CSRF cookies", () => {
            expect(COOKIE_CONFIG.SESSION.sameSite).toBe("strict");
            expect(COOKIE_CONFIG.CSRF.sameSite).toBe("strict");
        });

        it("should have appropriate maxAge values", () => {
            expect(COOKIE_CONFIG.SESSION.maxAge).toBeGreaterThan(0);
            expect(COOKIE_CONFIG.AUTH_TOKEN.maxAge).toBeGreaterThan(0);
            expect(COOKIE_CONFIG.CSRF.maxAge).toBeGreaterThan(0);
        });
    });

    describe("setSecureCookie", () => {
        it("should set cookie with correct configuration", () => {
            const response = NextResponse.json({ success: true });
            const result = setSecureCookie(response, "SESSION", "test-session-id");

            const cookie = result.cookies.get(COOKIE_CONFIG.SESSION.name);
            expect(cookie).toBeDefined();
            expect(cookie?.value).toBeTruthy();
        });

        it("should URL encode cookie values", () => {
            const response = NextResponse.json({ success: true });
            const specialValue = "test value with spaces & symbols!";
            const result = setSecureCookie(response, "SESSION", specialValue);

            const cookie = result.cookies.get(COOKIE_CONFIG.SESSION.name);
            expect(cookie?.value).toBe(encodeURIComponent(specialValue));
        });
    });

    describe("deleteSecureCookie", () => {
        it("should delete cookie by setting maxAge to 0", () => {
            const response = NextResponse.json({ success: true });
            setSecureCookie(response, "SESSION", "test");
            const result = deleteSecureCookie(response, "SESSION");

            const cookie = result.cookies.get(COOKIE_CONFIG.SESSION.name);
            expect(cookie?.value).toBe("");
        });
    });

    describe("validateCookieSecurity", () => {
        it("should validate secure prefix in production", () => {
            const originalEnv = process.env.NODE_ENV;
            setNodeEnv("production");

            const valid = validateCookieSecurity("__Host-session", {
                secure: true,
                httpOnly: true,
                sameSite: "strict",
            });

            // Should pass with __Host- prefix
            expect(valid).toBe(true);

            setNodeEnv(originalEnv ?? "");
        });

        it("should require secure flag in production", () => {
            const originalEnv = process.env.NODE_ENV;
            setNodeEnv("production");

            const valid = validateCookieSecurity("__Host-session", {
                secure: false,
                httpOnly: true,
            });

            expect(valid).toBe(false);

            setNodeEnv(originalEnv ?? "");
        });

        it("should require httpOnly for sensitive cookies in production", () => {
            const originalEnv = process.env.NODE_ENV;
            setNodeEnv("production");

            const valid = validateCookieSecurity("__Host-session", {
                secure: true,
                httpOnly: false,
            });

            expect(valid).toBe(false);

            setNodeEnv(originalEnv ?? "");
        });

        it("should skip validation in development", () => {
            const originalEnv = process.env.NODE_ENV;
            setNodeEnv("development");

            const valid = validateCookieSecurity("test-cookie", {
                secure: false,
                httpOnly: false,
            });

            expect(valid).toBe(true);

            setNodeEnv(originalEnv ?? "");
        });
    });

    describe("getSecureCookie", () => {
        it("should extract and decode cookie from request", () => {
            const cookieName = COOKIE_CONFIG.SESSION.name;
            const cookieValue = "test-value";
            const encodedValue = encodeURIComponent(cookieValue);

            const request = new Request("http://localhost", {
                headers: {
                    cookie: `${cookieName}=${encodedValue}`,
                },
            });

            const result = getSecureCookie(request, "SESSION");
            expect(result).toBe(cookieValue);
        });

        it("should return null for missing cookie", () => {
            const request = new Request("http://localhost", {
                headers: {
                    cookie: "other-cookie=value",
                },
            });

            const result = getSecureCookie(request, "SESSION");
            expect(result).toBeNull();
        });

        it("should handle multiple cookies", () => {
            const cookieName = COOKIE_CONFIG.SESSION.name;
            const cookieValue = "test-value";
            const encodedValue = encodeURIComponent(cookieValue);

            const request = new Request("http://localhost", {
                headers: {
                    cookie: `other=cookie; ${cookieName}=${encodedValue}; another=value`,
                },
            });

            const result = getSecureCookie(request, "SESSION");
            expect(result).toBe(cookieValue);
        });
    });
});
