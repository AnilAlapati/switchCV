import { NextResponse } from "next/server";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";
import { logger } from "@/lib/logger";

type ServiceStatus = {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
};

// SECURITY FIX: Cache health check results to prevent abuse.
// External callers hammering /api/health can no longer force repeated
// Firestore reads and Gemini API calls.
let cachedResult: {
  response: ReturnType<typeof NextResponse.json>;
  expiresAt: number;
} | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

const shouldBypassChecks = () =>
  process.env.NODE_ENV === "test" &&
  process.env.HEALTHCHECK_RUN_FULL !== "true";

const shouldUseCache = () => process.env.NODE_ENV !== "test";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function checkFirestore(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  const start = Date.now();
  try {
    await collectionRef(COLLECTIONS.MONITORING).limit(1).get();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "Firestore health check failed");
    return {
      status: "error",
    };
  }
}

async function checkGemini(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      const { getSecret } = await import("@/lib/services/secretManagerService");
      apiKey = await getSecret("GEMINI_API_KEY");
    } catch {
      // Secret Manager unavailable — fall through to error
    }
  }
  if (!apiKey) {
    return { status: "error" };
  }

  const start = Date.now();
  try {
    const response = await withTimeout(
      fetch(AI_ENDPOINTS.GEMINI.MODELS(apiKey), {
        method: "GET",
        next: { revalidate: 0 },
      }),
      5000,
      "Gemini health check",
    );

    if (!response.ok) {
      logger.warn(
        { statusCode: response.status },
        "Gemini API health check failed",
      );
      return {
        status: "error",
      };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "Gemini health check failed");
    return {
      status: "error",
    };
  }
}

export async function GET() {
  // Return cached result if still fresh (prevents quota/cost amplification)
  if (shouldUseCache() && cachedResult && Date.now() < cachedResult.expiresAt) {
    return cachedResult.response;
  }

  // Run checks sequentially to reduce peak memory pressure in SSR containers.
  // NOTE: Email is NOT checked here — all emails are sent via Cloud Functions
  // (Firestore `mail` collection + Firebase firestore-send-email extension),
  // not the Next.js app. Checking SMTP here was misleading.
  const firestore = await checkFirestore();
  const ai = await checkGemini();

  const services = { firestore, ai };
  const allHealthy = Object.values(services).every(
    (service) => service.status === "ok",
  );
  const criticalHealthy = firestore.status === "ok";

  // Only return status per service — no error details, no uptime, no infra info
  const sanitizedServices = Object.fromEntries(
    Object.entries(services).map(([key, svc]) => [
      key,
      { status: svc.status, latencyMs: svc.latencyMs },
    ]),
  );

  const response = NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: sanitizedServices,
    },
    { status: criticalHealthy ? 200 : 503 },
  );

  // Cache the result to prevent repeated expensive checks
  if (shouldUseCache()) {
    cachedResult = { response, expiresAt: Date.now() + CACHE_TTL_MS };
  }

  return response;
}
