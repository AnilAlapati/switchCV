/**
 * Security Headers Test Suite
 *
 * Validates that all required security headers are configured correctly
 */

import { describe, it, expect } from "@jest/globals";
import nextConfig from "../../../next.config";

describe("Security Headers", () => {
    const headers = nextConfig.headers ? nextConfig.headers() : [];

    it("should have headers configuration", async () => {
        const resolvedHeaders = await headers;
        expect(resolvedHeaders).toBeDefined();
        expect(Array.isArray(resolvedHeaders)).toBe(true);
        expect(resolvedHeaders.length).toBeGreaterThan(0);
    });

    it("should configure headers for all paths", async () => {
        const resolvedHeaders = await headers;
        const globalConfig = resolvedHeaders.find((h) => h.source === "/:path*");
        expect(globalConfig).toBeDefined();
        expect(globalConfig?.headers).toBeDefined();
    });

    describe("Required Security Headers", () => {
        let securityHeaders: Array<{ key: string; value: string }>;

        beforeAll(async () => {
            const resolvedHeaders = await headers;
            const globalConfig = resolvedHeaders.find((h) => h.source === "/:path*");
            securityHeaders = globalConfig?.headers || [];
        });

        it("should have Strict-Transport-Security (HSTS)", () => {
            const hsts = securityHeaders.find(
                (h) => h.key === "Strict-Transport-Security"
            );
            expect(hsts).toBeDefined();
            expect(hsts?.value).toContain("max-age=");
            expect(hsts?.value).toContain("includeSubDomains");
        });

        it("should have X-Content-Type-Options", () => {
            const contentType = securityHeaders.find(
                (h) => h.key === "X-Content-Type-Options"
            );
            expect(contentType).toBeDefined();
            expect(contentType?.value).toBe("nosniff");
        });

        it("should have X-Frame-Options", () => {
            const frameOptions = securityHeaders.find(
                (h) => h.key === "X-Frame-Options"
            );
            expect(frameOptions).toBeDefined();
            expect(frameOptions?.value).toBe("DENY");
        });

        it("should have X-XSS-Protection", () => {
            const xssProtection = securityHeaders.find(
                (h) => h.key === "X-XSS-Protection"
            );
            expect(xssProtection).toBeDefined();
            expect(xssProtection?.value).toContain("1");
        });

        it("should have Referrer-Policy", () => {
            const referrer = securityHeaders.find((h) => h.key === "Referrer-Policy");
            expect(referrer).toBeDefined();
            expect(referrer?.value).toBeTruthy();
        });

        it("should have Permissions-Policy", () => {
            const permissions = securityHeaders.find(
                (h) => h.key === "Permissions-Policy"
            );
            expect(permissions).toBeDefined();
            expect(permissions?.value).toBeTruthy();
        });



        it("should have X-Permitted-Cross-Domain-Policies", () => {
            const crossDomain = securityHeaders.find(
                (h) => h.key === "X-Permitted-Cross-Domain-Policies"
            );
            expect(crossDomain).toBeDefined();
            expect(crossDomain?.value).toBe("none");
        });

        it("should have Cross-Origin-Embedder-Policy", () => {
            const coep = securityHeaders.find(
                (h) => h.key === "Cross-Origin-Embedder-Policy"
            );
            expect(coep).toBeDefined();
            expect(coep?.value).toBe("require-corp");
        });

        it("should have Cross-Origin-Opener-Policy", () => {
            const coop = securityHeaders.find(
                (h) => h.key === "Cross-Origin-Opener-Policy"
            );
            expect(coop).toBeDefined();
            expect(coop?.value).toBe("same-origin");
        });

        it("should have Cross-Origin-Resource-Policy", () => {
            const corp = securityHeaders.find(
                (h) => h.key === "Cross-Origin-Resource-Policy"
            );
            expect(corp).toBeDefined();
            expect(corp?.value).toBe("same-origin");
        });
    });


});
