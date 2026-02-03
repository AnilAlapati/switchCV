import type { NextConfig } from "next";
import packageJson from "./package.json";

const isDev = process.env.NODE_ENV === "development";

// CSP directives - stricter in production
const cspDirectives = [
  "default-src 'self'",
  // In development, allow eval for hot reload. In production, use stricter policy
  // blob: needed for Three.js/R3F workers and postprocessing
  `script-src 'self' ${isDev ? "'unsafe-eval'" : ""
    } 'unsafe-inline' blob: https://www.googletagmanager.com https://apis.google.com`.trim(),
  // Style-src requires unsafe-inline for Next.js styled-jsx and inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://firestore.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Worker-src for Three.js postprocessing and WebGL workers
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
];

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
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
    ],
  },
  // Silence the Turbopack warning/error in Next.js 16 by providing an empty object
  turbopack: {},
};

export default nextConfig;
