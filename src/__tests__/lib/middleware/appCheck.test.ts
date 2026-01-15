/**
 * App Check Middleware Tests
 *
 * Tests for Firebase App Check verification middleware
 */

import { NextRequest } from "next/server";

// Mock the dynamic import of firebase-admin/app-check
const mockVerifyToken = jest.fn();
jest.mock("firebase-admin/app-check", () => ({
    getAppCheck: jest.fn(() => ({
        verifyToken: mockVerifyToken,
    })),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

import {
    verifyAppCheckToken,
    isAppCheckEnforced,
    isProtectedPath,
    withAppCheck,
} from "@/lib/middleware/appCheck";

describe("App Check Middleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVerifyToken.mockReset();
        // Reset environment
        delete process.env.ENFORCE_APP_CHECK;
    });

    describe("verifyAppCheckToken", () => {
        it("should return invalid when token is null", async () => {
            const result = await verifyAppCheckToken(null);

            expect(result.valid).toBe(false);
            expect(result.error).toBe("Missing App Check token");
            expect(mockVerifyToken).not.toHaveBeenCalled();
        });

        it("should return invalid when token is empty string", async () => {
            const result = await verifyAppCheckToken("");

            expect(result.valid).toBe(false);
            expect(result.error).toBe("Missing App Check token");
        });

        it("should return valid when token verification succeeds", async () => {
            mockVerifyToken.mockResolvedValueOnce({ token: "valid" });

            const result = await verifyAppCheckToken("valid-token");

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
        });

        it("should return invalid when token verification fails", async () => {
            mockVerifyToken.mockRejectedValueOnce(new Error("Invalid token"));

            const result = await verifyAppCheckToken("invalid-token");

            expect(result.valid).toBe(false);
            expect(result.error).toBe("Invalid token");
        });

        it("should handle non-Error rejection", async () => {
            mockVerifyToken.mockRejectedValueOnce("String error");

            const result = await verifyAppCheckToken("bad-token");

            expect(result.valid).toBe(false);
            expect(result.error).toBe("Token verification failed");
        });
    });

    describe("isAppCheckEnforced", () => {
        it("should return false when ENFORCE_APP_CHECK is not set", () => {
            delete process.env.ENFORCE_APP_CHECK;
            expect(isAppCheckEnforced()).toBe(false);
        });

        it("should return false when ENFORCE_APP_CHECK is 'false'", () => {
            process.env.ENFORCE_APP_CHECK = "false";
            expect(isAppCheckEnforced()).toBe(false);
        });

        it("should return true when ENFORCE_APP_CHECK is 'true'", () => {
            process.env.ENFORCE_APP_CHECK = "true";
            expect(isAppCheckEnforced()).toBe(true);
        });
    });

    describe("isProtectedPath", () => {
        it("should return true for AI generate endpoint", () => {
            expect(isProtectedPath("/api/ai/generate")).toBe(true);
        });

        it("should return true for AI generate-resume endpoint", () => {
            expect(isProtectedPath("/api/ai/generate-resume")).toBe(true);
        });

        it("should return true for resume create endpoint", () => {
            expect(isProtectedPath("/api/resume/create")).toBe(true);
        });

        it("should return true for seed generate endpoint", () => {
            expect(isProtectedPath("/api/seed/generate")).toBe(true);
        });

        it("should return false for non-protected paths", () => {
            expect(isProtectedPath("/api/user/profile")).toBe(false);
            expect(isProtectedPath("/api/auth/login")).toBe(false);
            expect(isProtectedPath("/api/resumes")).toBe(false);
        });

        it("should match paths that start with protected prefix", () => {
            expect(isProtectedPath("/api/ai/generate/status")).toBe(true);
            expect(isProtectedPath("/api/resume/create/draft")).toBe(true);
        });
    });

    describe("withAppCheck", () => {
        const createMockRequest = (
            pathname: string,
            appCheckToken?: string
        ): NextRequest => {
            const headers = new Headers();
            if (appCheckToken) {
                headers.set("X-Firebase-AppCheck", appCheckToken);
            }
            headers.set("x-forwarded-for", "127.0.0.1");

            return {
                headers,
                nextUrl: { pathname },
            } as unknown as NextRequest;
        };

        it("should return null when App Check is not enforced", async () => {
            delete process.env.ENFORCE_APP_CHECK;
            const request = createMockRequest("/api/ai/generate");

            const result = await withAppCheck(request);

            expect(result).toBeNull();
        });

        it("should return null for non-protected paths even when enforced", async () => {
            process.env.ENFORCE_APP_CHECK = "true";
            const request = createMockRequest("/api/user/profile");

            const result = await withAppCheck(request);

            expect(result).toBeNull();
        });

        it("should return 401 when token is missing on protected path", async () => {
            process.env.ENFORCE_APP_CHECK = "true";
            const request = createMockRequest("/api/ai/generate");

            const result = await withAppCheck(request);

            expect(result).not.toBeNull();
            expect(result?.status).toBe(401);
            const body = await result?.json();
            expect(body.code).toBe("APP_CHECK_FAILED");
        });

        it("should return 401 when token is invalid on protected path", async () => {
            process.env.ENFORCE_APP_CHECK = "true";
            mockVerifyToken.mockRejectedValueOnce(new Error("Invalid"));
            const request = createMockRequest("/api/ai/generate", "bad-token");

            const result = await withAppCheck(request);

            expect(result).not.toBeNull();
            expect(result?.status).toBe(401);
        });

        it("should return null when token is valid on protected path", async () => {
            process.env.ENFORCE_APP_CHECK = "true";
            mockVerifyToken.mockResolvedValueOnce({ token: "valid" });
            const request = createMockRequest("/api/ai/generate", "valid-token");

            const result = await withAppCheck(request);

            expect(result).toBeNull();
        });
    });
});
