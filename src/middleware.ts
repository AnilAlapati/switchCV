import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths to exclude from global rate limiting (e.g. static assets)
const EXCLUDED_PATHS = ["/_next", "/favicon.ico", "/public"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip excluded paths
    if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Note: Rate limiting is handled per-route via checkDistributedRateLimit
    // in individual API routes due to Edge Runtime limitations with Firebase Admin.
    // 
    // CRITICAL: Next.js Middleware runs in Edge Runtime by default.
    // Firebase Admin (used by checkDistributedRateLimit) does NOT work in Edge.
    //
    // Current approach: Each API route applies checkDistributedRateLimit directly.
    // Future improvement: Use Edge-compatible rate limiter (e.g., Upstash Redis).

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
