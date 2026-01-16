/**
 * Session Security Middleware
 *
 * Provides utilities for secure cookie management and session handling.
 * Implements best practices for cookie security including HttpOnly,
 * Secure, SameSite, and cookie prefixes.
 *
 * @module lib/middleware/session
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Cookie configuration for different security levels
 */
export const COOKIE_CONFIG = {
    // Session cookie (most secure)
    SESSION: {
        name: "__Host-session", // __Host- prefix requires secure, path=/
        httpOnly: true,
        secure: true, // Always true - enforced by __Host- prefix
        sameSite: "strict" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    // Authentication token
    AUTH_TOKEN: {
        name: "__Secure-auth-token", // __Secure- prefix requires secure flag
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    },
    // CSRF token (needs to be readable by client)
    CSRF: {
        name: "__Host-csrf",
        httpOnly: false, // Client needs to read this
        secure: true,
        sameSite: "strict" as const,
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
    },
    // Preferences (non-sensitive data)
    PREFERENCES: {
        name: "__Secure-prefs",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
    },
} as const;

/**
 * Set a secure cookie on the response
 *
 * @param response - NextResponse to set cookie on
 * @param cookieType - Type of cookie from COOKIE_CONFIG
 * @param value - Cookie value
 * @returns Response with cookie set
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ success: true });
 * setSecureCookie(response, 'SESSION', sessionId);
 * ```
 */
export function setSecureCookie(
    response: NextResponse,
    cookieType: keyof typeof COOKIE_CONFIG,
    value: string
): NextResponse {
    const config = COOKIE_CONFIG[cookieType];

    response.cookies.set({
        name: config.name,
        value: encodeURIComponent(value),
        httpOnly: config.httpOnly,
        secure: config.secure,
        sameSite: config.sameSite,
        maxAge: config.maxAge,
        path: config.path,
    });

    return response;
}

/**
 * Delete a secure cookie from the response
 *
 * @param response - NextResponse to delete cookie from
 * @param cookieType - Type of cookie from COOKIE_CONFIG
 * @returns Response with cookie deleted
 */
export function deleteSecureCookie(
    response: NextResponse,
    cookieType: keyof typeof COOKIE_CONFIG
): NextResponse {
    const config = COOKIE_CONFIG[cookieType];

    response.cookies.set({
        name: config.name,
        value: "",
        httpOnly: config.httpOnly,
        secure: config.secure,
        sameSite: config.sameSite,
        maxAge: 0,
        path: config.path,
    });

    return response;
}

/**
 * Validate cookie security settings
 *
 * This function checks if cookies meet security requirements in production.
 * Use in tests to ensure cookie security compliance.
 *
 * @param cookieName - Name of the cookie
 * @param cookieAttributes - Cookie attributes to validate
 * @returns True if cookie meets security requirements
 */
export function validateCookieSecurity(
    cookieName: string,
    cookieAttributes: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: string;
    }
): boolean {
    if (process.env.NODE_ENV !== "production") {
        return true; // Skip validation in development
    }

    // Session and CSRF cookies must use __Host- or __Secure- prefix in production
    const hasSecurePrefix =
        cookieName.startsWith("__Host-") || cookieName.startsWith("__Secure-");

    if (!hasSecurePrefix) {
        logger.warn(
            `Cookie "${cookieName}" should use __Host- or __Secure- prefix in production`
        );
        return false;
    }

    // All cookies must be secure in production
    if (!cookieAttributes.secure) {
        logger.warn(`Cookie "${cookieName}" must have secure flag in production`);
        return false;
    }

    // Sensitive cookies should be HttpOnly
    if (
        cookieName.includes("session") ||
        cookieName.includes("auth") ||
        cookieName.includes("token")
    ) {
        if (!cookieAttributes.httpOnly) {
            logger.warn(
                `Sensitive cookie "${cookieName}" should be HttpOnly in production`
            );
            return false;
        }
    }

    return true;
}

/**
 * Get cookie value from request
 *
 * @param request - Request to extract cookie from
 * @param cookieType - Type of cookie from COOKIE_CONFIG
 * @returns Decoded cookie value or null if not found
 */
export function getSecureCookie(
    request: Request,
    cookieType: keyof typeof COOKIE_CONFIG
): string | null {
    const config = COOKIE_CONFIG[cookieType];
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
        return null;
    }

    const match = cookieHeader.match(
        new RegExp(`${config.name}=([^;]+)`)
    );

    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}
