import { createHash } from "crypto";
import {
    COLLECTIONS,
    collectionRef,
    serverTimestamp,
    timestampFromDate
} from "@/lib/dal";

import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-helpers";

export class RateLimitError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
        super("Too many requests");
        this.name = "RateLimitError";
    }
}

export class EntitlementError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EntitlementError";
    }
}

const AUDIT_LOG_TTL_DAYS = Number(process.env.AI_AUDIT_LOG_TTL_DAYS || 30);
const AUDIT_LOG_TTL_MS = AUDIT_LOG_TTL_DAYS * 24 * 60 * 60 * 1000;

export function hashPrompt(prompt: string): string {
    return createHash("sha256").update(prompt).digest("hex");
}

export function attachRateLimitHeaders(
    response: NextResponse,
    data: { remaining: number; resetIn?: number; limit: number },
) {
    response.headers.set("X-RateLimit-Limit", data.limit.toString());
    response.headers.set("X-RateLimit-Remaining", data.remaining.toString());
    if (data.resetIn) {
        response.headers.set(
            "X-RateLimit-Reset",
            Math.floor(Date.now() / 1000 + data.resetIn / 1000).toString(),
        );
    }
}

export async function logUsage(params: {
    userId: string;
    prompt: string;
    model: string;
    plan: string;
    maxTokens: number;
    temperature: number;
    task?: string;
}) {
    await collectionRef(COLLECTIONS.AI_USAGE_LOGS).add({
        userId: params.userId,
        plan: params.plan,
        scope: "ai_generation",
        task: params.task || "unknown",
        promptChars: params.prompt.length,
        requestedTokens: params.maxTokens,
        temperature: params.temperature,
        model: params.model,
        createdAt: serverTimestamp(),
    });
}

export async function logAuditEvent(params: {
    userId: string;
    prompt: string;
    model: string;
    status: string;
    requestId: string;
}) {
    const promptHash = hashPrompt(params.prompt);
    const expiresAt = timestampFromDate(new Date(Date.now() + AUDIT_LOG_TTL_MS));

    await collectionRef(COLLECTIONS.AI_AUDIT_LOGS).add({
        userId: params.userId,
        promptHash,
        promptLength: params.prompt.length,
        model: params.model,
        status: params.status,
        requestId: params.requestId,
        timestamp: serverTimestamp(),
        expiresAt,
    });
}

export function handleRouteError(error: unknown) {
    if (error instanceof RateLimitError) {
        const response = handleApiError(
            error,
            "Too many requests. Please try again later.",
            429,
        );
        response.headers.set("Retry-After", error.retryAfterSeconds.toString());
        return response;
    }

    if (error instanceof EntitlementError) {
        return handleApiError(
            error,
            "Access denied - insufficient entitlement",
            403,
        );
    }

    return handleApiError(error, "AI text generation failed");
}
