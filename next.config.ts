import type { NextConfig } from "next";
import packageJson from "./package.json";

const isDev = process.env.NODE_ENV === "development";

// CSP directives - stricter in production
const cspDirectives = [
  "default-src 'self'",
  // In development, allow eval for hot reload. In production, use stricter policy
  `script-src 'self' ${
    isDev ? "'unsafe-eval'" : ""
  } 'unsafe-inline' https://www.googletagmanager.com https://apis.google.com`.trim(),
  // Style-src requires unsafe-inline for Next.js styled-jsx and inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://firestore.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
  serverExternalPackages: ["pino", "pino-pretty", "firebase-admin"],
  transpilePackages: ["path-scurry"],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "node:process": "process",
      "node:path": "path",
      "node:fs": "fs",
      "node:url": "url",
      "node:util": "util",
      "node:vm": "vm",
      "node:module": "module",
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve("process/browser"),
        path: require.resolve("path-browserify"),
        fs: false,
        "pino-pretty": false,
      };
    }

    // Exclude pino-pretty from Edge Runtime to prevent process.stdout.isTTY errors
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        "pino-pretty": "pino-pretty",
      });
    }

    return config;
  },
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
        ],
      },
    ];
  },
  typescript: {
    // Strict type checking enabled for production quality
    // Run `npx tsc --noEmit` to see all type errors before building
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
    ],
  },

  turbopack: {
    resolveAlias: {
      "node:process": "process",
      "node:path": "path",
      "node:fs": "fs",
      "node:url": "url",
      "node:util": "util",
      "node:vm": "vm",
      "node:module": "module",
    },
  },
};

export default nextConfig;
