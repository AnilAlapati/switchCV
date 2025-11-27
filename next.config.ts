import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  typescript: {
    // Strict type checking enabled for production quality
    // Run `npx tsc --noEmit` to see all type errors before building
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
