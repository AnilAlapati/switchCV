// src/middleware.ts - Next.js middleware
import { NextRequest, NextResponse } from "next/server";
import { checkEdgeRateLimit } from "@/lib/utils/edgeRateLimit";

// NOTE: next-intl middleware is disabled because app structure doesn't use [locale] routing
// To enable i18n, restructure app directory to src/app/[locale]/page.tsx pattern
// import createMiddleware from "next-intl/middleware";
// const i18nMiddleware = createMiddleware({
//   locales: ["en", "es", "fr", "de"],
//   defaultLocale: "en",
//   localePrefix: "never",
// });

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

// Reserved for future use - maintenance mode caching
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const maintenanceCache: MaintenanceCache = {
  config: null,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  timestamp: 0,
};

async function getMaintenanceConfig(): Promise<{
  isActive: boolean;
  blocking: boolean;
} | null> {
  // NOTE: Firebase Admin cannot be used in Next.js Middleware (Edge Runtime).
  // Maintenance mode checks should be moved to a separate API route or Edge Config.
  // Returning default (no maintenance) to prevent runtime crashes.
  return { isActive: false, blocking: false };
}

export async function middleware(request: NextRequest) {
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

  // 3. Page Routes: Check Maintenance mode
  try {
    const maintenance = await getMaintenanceConfig();

    // If maintenance is active and blocking is enabled, redirect to maintenance page
    if (maintenance?.isActive && maintenance?.blocking) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  } catch {
    // Silently fail - let request through if there's any error
  }

  // 4. Allow request to proceed normally
  return NextResponse.next();
}

export const config = {
  // Matcher excluding static files and internal next paths
  matcher: ["/((?!_next|.*\\..*).*)"],
};
