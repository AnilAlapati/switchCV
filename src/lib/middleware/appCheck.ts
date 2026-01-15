/**
 * Firebase App Check Middleware
 *
 * Verifies that requests to protected endpoints come from legitimate app instances.
 * This prevents bot attacks and wallet-draining attempts on AI endpoints.
 *
 * @see https://firebase.google.com/docs/app-check
 * @module lib/middleware/appCheck
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const APP_CHECK_HEADER = "X-Firebase-AppCheck";

// Endpoints that should enforce App Check (high-cost AI operations)
const PROTECTED_PATHS = [
    "/api/ai/generate",
    "/api/ai/generate-resume",
    "/api/resume/create",
    "/api/seed/generate",
];

interface AppCheckResult {
    valid: boolean;
    error?: string;
}

/**
 * Lazily get the App Check verifier to avoid ESM import issues in test environments
 */
async function getAppCheckVerifier() {
    // Dynamic import to avoid Jest ESM issues
    const { getAppCheck } = await import("firebase-admin/app-check");
    return getAppCheck();
}

/**
 * Verify a Firebase App Check token
 *
 * @param token The App Check token from request headers
 * @returns Verification result with validity status
 */
export async function verifyAppCheckToken(
    token: string | null
): Promise<AppCheckResult> {
    if (!token) {
        return { valid: false, error: "Missing App Check token" };
    }

    try {
        // Verify the token with Firebase Admin SDK
        const appCheck = await getAppCheckVerifier();
        await appCheck.verifyToken(token);
        return { valid: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Token verification failed";
        logger.warn({ error: message }, "App Check token verification failed");
        return { valid: false, error: message };
    }
}

/**
 * Check if App Check enforcement is enabled
 *
 * This allows gradual rollout - set ENFORCE_APP_CHECK=true in production
 * when ready to block unauthenticated app requests.
 */
export function isAppCheckEnforced(): boolean {
    return process.env.ENFORCE_APP_CHECK === "true";
}

/**
 * Check if a path should be protected by App Check
 */
export function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * App Check middleware for protecting AI endpoints
 *
 * Usage in API routes:
 * ```typescript
 * import { withAppCheck } from "@/lib/middleware/appCheck";
 *
 * export async function POST(request: NextRequest) {
 *   const appCheckResult = await withAppCheck(request);
 *   if (appCheckResult) return appCheckResult; // Returns 401 if failed
 *
 *   // Continue with normal processing
 * }
 * ```
 */
export async function withAppCheck(
    request: NextRequest
): Promise<NextResponse | null> {
    // Skip enforcement if not enabled
    if (!isAppCheckEnforced()) {
        return null;
    }

    // Skip for non-protected paths
    if (!isProtectedPath(request.nextUrl.pathname)) {
        return null;
    }

    const token = request.headers.get(APP_CHECK_HEADER);
    const result = await verifyAppCheckToken(token);

    if (!result.valid) {
        logger.warn(
            {
                path: request.nextUrl.pathname,
                error: result.error,
                ip: request.headers.get("x-forwarded-for") || "unknown",
            },
            "🚫 App Check verification failed"
        );

        return NextResponse.json(
            {
                error: "App verification failed",
                code: "APP_CHECK_FAILED",
            },
            { status: 401 }
        );
    }

    return null; // Verification passed, continue processing
}

/**
 * Create an App Check verification wrapper for route handlers
 *
 * Usage:
 * ```typescript
 * import { requireAppCheck } from "@/lib/middleware/appCheck";
 *
 * export const POST = requireAppCheck(async (request: NextRequest) => {
 *   // Handler is only called if App Check passes
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function requireAppCheck(
    handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
    return async (request: NextRequest) => {
        const appCheckResult = await withAppCheck(request);
        if (appCheckResult) {
            return appCheckResult;
        }
        return handler(request);
    };
}
