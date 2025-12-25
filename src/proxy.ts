// src/proxy.ts - Next.js middleware
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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
  // Don't intercept maintenance page itself, API routes, or static assets
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/maintenance") ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/static/") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  try {
    const maintenance = await getMaintenanceConfig();

    // If maintenance is active and blocking is enabled, redirect to maintenance page
    if (maintenance?.isActive && maintenance?.blocking) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  } catch {
    // Silently fail - let request through if there's any error
    // console.error("Middleware error:", error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next|static|favicon\\.ico).*)",
  ],
};
