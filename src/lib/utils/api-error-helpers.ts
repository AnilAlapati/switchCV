/**
 * Secure API Error Handlers
 *
 * Provides secure error handling utilities that prevent information leakage
 * while logging detailed errors server-side.
 *
 * @module lib/utils/api-error-helpers
 */

import { NextResponse } from "next/server";
import { logger, sanitizeForLogging } from "@/lib/logger";

/**
 * Enhanced error handler that prevents information leakage
 * Logs detailed errors server-side while returning generic messages to clients
 *
 * @param error - The error object
 * @param options - Configuration options
 * @returns NextResponse with appropriate error message
 *
 * @example
 * ```typescript
 * try {
 *   // ... your logic
 * } catch (err) {
 *   return handleSecureApiError(err, {
 *     publicMessage: 'Failed to process request',
 *     status: 500,
 *     logDetails: true
 *   });
 * }
 * ```
 */
export function handleSecureApiError(
    error: unknown,
    options: {
        publicMessage?: string;
        status?: number;
        logDetails?: boolean;
        userId?: string;
        endpoint?: string;
    } = {}
): NextResponse {
    const {
        publicMessage = "An error occurred processing your request",
        status = 500,
        logDetails = true,
        userId,
        endpoint,
    } = options;

    // Determine error type for better logging
    let errorType = "Unknown";
    let errorMsg = "Unknown error";
    let stack = undefined;

    if (error instanceof Error) {
        errorType = error.constructor.name;
        errorMsg = error.message;
        stack = error.stack;
    } else if (typeof error === "object" && error !== null) {
        errorMsg = JSON.stringify(error);
    } else {
        errorMsg = String(error);
    }

    // Log detailed error server-side with PII redaction
    if (logDetails) {
        // Sanitize error message and stack to prevent PII leakage
        const sanitizedData = sanitizeForLogging({
            errorType,
            errorMsg,
            stack,
            userId, // Safe - just a UUID
            endpoint,
            status,
        });

        logger.error(sanitizedData, "API Error - Detailed Log");
    }

    // Return generic message to client (prevent info leakage)
    return NextResponse.json(
        {
            error: publicMessage,
            // Only include request ID in development or if explicitly requested
            ...(process.env.NODE_ENV === "development" && {
                requestId: Math.random().toString(36).substr(2, 9),
            }),
        },
        { status }
    );
}

/**
 * Transform Firebase Auth errors to generic messages
 * Prevents attackers from determining valid user emails
 *
 * @param error - Firebase Auth error
 * @returns Generic error message safe for client display
 */
export function getSecureAuthErrorMessage(error: unknown): string {
    const errorStr = error instanceof Error ? error.message : String(error);

    // Generic message for all auth errors
    const authErrors: Record<string, string> = {
        "auth/user-not-found": "Invalid email or password",
        "auth/wrong-password": "Invalid email or password",
        "auth/email-already-in-use": "Invalid email or password",
        "auth/weak-password": "Password does not meet requirements",
        "auth/invalid-email": "Invalid email or password",
        "auth/operation-not-allowed": "This operation is not available",
        "auth/too-many-requests":
            "Too many login attempts. Please try again later.",
    };

    for (const [key, message] of Object.entries(authErrors)) {
        if (errorStr.includes(key)) {
            return message;
        }
    }

    // Default generic message
    return "Authentication failed. Please try again.";
}

/**
 * Transform Firestore errors to generic messages
 * Prevents exposure of database structure
 *
 * @param error - Firestore error
 * @returns Generic error message safe for client display
 */
export function getSecureFirestoreErrorMessage(error: unknown): string {
    const errorStr = error instanceof Error ? error.message : String(error);

    if (errorStr.includes("PERMISSION_DENIED")) {
        return "You do not have permission to perform this action";
    }

    if (errorStr.includes("NOT_FOUND")) {
        return "The requested resource was not found";
    }

    if (errorStr.includes("ALREADY_EXISTS")) {
        return "This resource already exists";
    }

    if (errorStr.includes("FAILED_PRECONDITION")) {
        return "Cannot perform this operation at this time";
    }

    if (errorStr.includes("RESOURCE_EXHAUSTED")) {
        return "Service limit exceeded. Please try again later.";
    }

    if (errorStr.includes("UNAVAILABLE")) {
        return "Service temporarily unavailable. Please try again later.";
    }

    // Default generic message
    return "Unable to process your request. Please try again.";
}
