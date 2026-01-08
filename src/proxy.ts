// src/proxy.ts - Next.js middleware
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { checkEdgeRateLimit } from "@/lib/utils/edgeRateLimit";
import createMiddleware from "next-intl/middleware";

// Initialize i18n middleware
const i18nMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ["en", "es", "fr", "de"],

  // Used when no locale matches
  defaultLocale: "en",
});

// In-memory cache for maintenance config
interface MaintenanceCache {
  config: {
    isActive: boolean;
    blocking: boolean;
  } | null;
  cacheTtlMs: number; // Cache duration in milliseconds
  timestamp: number;
}

// Default cache TTL: 24 hours (can be overridden by Firestore config)
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let maintenanceCache: MaintenanceCache = {
  config: null,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  timestamp: 0,
};

async function getMaintenanceConfig(): Promise<{
  isActive: boolean;
  blocking: boolean;
} | null> {
  const now = Date.now();

  // Return cached value if still fresh (use the cacheTtlMs from Firestore)
  if (
    maintenanceCache.config !== null &&
    now - maintenanceCache.timestamp < maintenanceCache.cacheTtlMs
  ) {
    return maintenanceCache.config;
  }

  try {
    // Fetch from Firestore
    const docRef = adminDb.collection("config").doc("system");
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      const config = snapshot.data();
      const maintenance = config?.maintenance || {
        isActive: false,
        blocking: false,
      };

      // Get cache TTL from Firestore config, fallback to default
      const cacheTtlMs =
        config?.cache?.maintenanceConfigCacheTtlMs || DEFAULT_CACHE_TTL_MS;

      // Update cache with both config and cache TTL
      maintenanceCache = {
        config: {
          isActive: maintenance.isActive ?? false,
          blocking: maintenance.blocking ?? false,
        },
        cacheTtlMs,
        timestamp: now,
      };

      return maintenanceCache.config;
    }
  } catch {
    // On error, return cached value if available, otherwise assume no maintenance
    // console.error("Middleware error checking maintenance status:", error);
    return maintenanceCache.config || { isActive: false, blocking: false };
  }

  return { isActive: false, blocking: false };
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. API Routes: Apply Rate Limiting Only
  if (path.startsWith("/api")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Limit: 100 requests per minute per IP
    const limit = 100;
    const windowMs = 60 * 1000;
    const result = checkEdgeRateLimit(ip, limit, windowMs);

    const headers = new Headers(request.headers);
    headers.set("X-RateLimit-Limit", result.limit.toString());
    headers.set("X-RateLimit-Remaining", result.remaining.toString());
    headers.set("X-RateLimit-Reset", result.resetIn.toString());

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Global rate limit exceeded. Please slow down.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetIn.toString(),
          },
        }
      );
    }
    return NextResponse.next({ headers });
  }

  // 2. Skip for static assets and maintenance page
  if (
    path.startsWith("/maintenance") ||
    path.startsWith("/_next/") ||
    path.startsWith("/static/") ||
    path === "/favicon.ico" ||
    path.includes(".") // file extensions
  ) {
    return NextResponse.next();
  }

  // 3. Page Routes: Check Maintenance then i18n
  try {
    const maintenance = await getMaintenanceConfig();

    // If maintenance is active and blocking is enabled, redirect to maintenance page
    if (maintenance?.isActive && maintenance?.blocking) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  } catch {
    // Silently fail - let request through if there's any error
  }

  // 4. Apply i18n Middleware
  return i18nMiddleware(request);
}

export const config = {
  // Matcher excluding static files and internal next paths
  matcher: ["/((?!_next|.*\\..*).*)"],
};
