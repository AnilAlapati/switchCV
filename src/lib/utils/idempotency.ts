/**
 * Idempotency Key Utility
 *
 * Prevents double-processing of requests when retry logic fires.
 * Uses Firestore to store request keys with TTL for automatic cleanup.
 *
 * @module lib/utils/idempotency
 */

import { NextRequest, NextResponse } from "next/server";
 
import admin, { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

const IDEMPOTENCY_COLLECTION = "idempotencyKeys";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const IDEMPOTENCY_HEADER = "x-idempotency-key";

export type IdempotencyStatus = "new" | "cached" | "processing";

export interface IdempotencyResult<T = unknown> {
    status: IdempotencyStatus;
    data?: T;
    key?: string;
}

export interface StoredIdempotencyRecord {
    key: string;
    userId: string;
    status: "processing" | "completed";
    response?: string; // JSON-serialized response
    createdAt: FirebaseFirestore.Timestamp;
    expiresAt: FirebaseFirestore.Timestamp;
    completedAt?: FirebaseFirestore.Timestamp;
}

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(request: NextRequest): string | null {
    return request.headers.get(IDEMPOTENCY_HEADER);
}

/**
 * Check if a request with the given idempotency key has already been processed
 *
 * @returns IdempotencyResult with status indicating if request is new, cached, or in-progress
 */
export async function checkIdempotency<T = unknown>(
    key: string,
    userId: string
): Promise<IdempotencyResult<T>> {
    try {
        const docRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(`${userId}_${key}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { status: "new", key };
        }

        const record = doc.data() as StoredIdempotencyRecord;

        // Check if record has expired
        if (record.expiresAt.toMillis() < Date.now()) {
            // Expired, treat as new
            await docRef.delete();
            return { status: "new", key };
        }

        // Check if still processing (concurrent request)
        if (record.status === "processing") {
            logger.warn({ key, userId }, "Idempotency: Request still processing");
            return { status: "processing", key };
        }

        // Completed - return cached response
        if (record.response) {
            logger.info({ key, userId }, "Idempotency: Returning cached response");
            return {
                status: "cached",
                data: JSON.parse(record.response) as T,
                key,
            };
        }

        return { status: "new", key };
    } catch (error) {
        logger.error({ error, key, userId }, "Idempotency check failed");
        // On error, allow the request to proceed (fail-open)
        return { status: "new", key };
    }
}

/**
 * Mark a request as being processed (to prevent concurrent duplicates)
 */
export async function markProcessing(key: string, userId: string): Promise<void> {
    try {
        const docRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(`${userId}_${key}`);
        const now = admin.firestore.Timestamp.now();
        const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS);

        await docRef.set({
            key,
            userId,
            status: "processing",
            createdAt: now,
            expiresAt,
        } as StoredIdempotencyRecord);

        logger.debug({ key, userId }, "Idempotency: Marked as processing");
    } catch (error) {
        logger.error({ error, key, userId }, "Failed to mark idempotency as processing");
        // Non-critical, continue processing
    }
}

/**
 * Store the successful response for an idempotency key
 */
export async function storeIdempotencyResponse<T>(
    key: string,
    userId: string,
    response: T
): Promise<void> {
    try {
        const docRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(`${userId}_${key}`);

        await docRef.update({
            status: "completed",
            response: JSON.stringify(response),
            completedAt: admin.firestore.Timestamp.now(),
        });

        logger.debug({ key, userId }, "Idempotency: Response stored");
    } catch (error) {
        logger.error({ error, key, userId }, "Failed to store idempotency response");
        // Non-critical, the request was still processed successfully
    }
}

/**
 * Clear an idempotency key (e.g., on error, to allow retry)
 */
export async function clearIdempotencyKey(key: string, userId: string): Promise<void> {
    try {
        const docRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(`${userId}_${key}`);
        await docRef.delete();
        logger.debug({ key, userId }, "Idempotency: Key cleared");
    } catch (error) {
        logger.error({ error, key, userId }, "Failed to clear idempotency key");
    }
}

/**
 * Helper to create a "processing" response for concurrent requests
 */
export function createProcessingResponse(): NextResponse {
    return NextResponse.json(
        {
            error: "Request is already being processed",
            code: "IDEMPOTENCY_CONFLICT",
        },
        { status: 409 }
    );
}

/**
 * Helper to create a cached response with appropriate headers
 */
export function createCachedResponse<T>(data: T): NextResponse {
    const response = NextResponse.json(data, { status: 200 });
    response.headers.set("X-Idempotency-Cached", "true");
    return response;
}

/**
 * High-level wrapper for idempotent request handling
 *
 * @example
 * ```typescript
 * const idempotencyKey = getIdempotencyKey(request);
 * if (idempotencyKey) {
 *   const result = await withIdempotency(idempotencyKey, userId, async () => {
 *     // Your actual processing logic
 *     return { data: "result" };
 *   });
 *   if (result.cached) return result.response;
 * }
 * ```
 */
export async function withIdempotency<T>(
    key: string,
    userId: string,
    handler: () => Promise<T>
): Promise<{ cached: boolean; response: NextResponse; data?: T }> {
    // Check if already processed
    const check = await checkIdempotency<T>(key, userId);

    if (check.status === "cached" && check.data !== undefined) {
        return {
            cached: true,
            response: createCachedResponse(check.data),
            data: check.data,
        };
    }

    if (check.status === "processing") {
        return {
            cached: false,
            response: createProcessingResponse(),
        };
    }

    // Mark as processing
    await markProcessing(key, userId);

    try {
        // Execute the handler
        const result = await handler();

        // Store the response
        await storeIdempotencyResponse(key, userId, result);

        return {
            cached: false,
            response: NextResponse.json(result, { status: 200 }),
            data: result,
        };
    } catch (error) {
        // Clear the key on error to allow retry
        await clearIdempotencyKey(key, userId);
        throw error;
    }
}
