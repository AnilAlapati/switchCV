import type { NextConfig } from "next";
import packageJson from "./package.json";

if (process.env.NODE_ENV === 'development') {
  // HMR + Firebase Admin gRPC causes exit listener accumulation in dev.
  // Setting to 0 = unlimited listeners, safe only in dev mode.
  // See docs/error_v1.md for full explanation.
  process.setMaxListeners(0);
}


const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "lodash",
      "framer-motion",
    ],
  },
  // Removing serverExternalPackages, transpilePackages, and webpack/turbopack configs
  // and relying on Next.js 16 defaults for the Firebase environment.
  transpilePackages: ["path-scurry"],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
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
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Proxy Firebase Auth requests to the actual Firebase project domain.
    // This allows using a custom domain (like switchcv.com) for NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    // without breaking the Google Sign-in flow which requires the /__/auth/handler.
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const firebaseDomain = firebaseProjectId
      ? `${firebaseProjectId}.firebaseapp.com`
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseDomain}/__/auth/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },
  // Silence the Turbopack warning/error in Next.js 16 by providing an empty object
  turbopack: {},
};

export default nextConfig;
