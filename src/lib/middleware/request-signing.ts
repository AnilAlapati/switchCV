/**
 * Request Signing Middleware
 *
 * Signs sensitive API requests to prevent tampering and replay attacks
 *
 * @module lib/middleware/request-signing
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logger";

/**
 * Request signature format
 */
interface RequestSignature {
  signature: string;
  timestamp: number;
  nonce: string;
}

/**
 * Secret for signing requests
 * Should be stored in environment variables
 */
const REQUEST_SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || "default-secret";
const REQUEST_SIGNING_ENABLED =
  process.env.REQUEST_SIGNING_ENABLED !== "false";
const SIGNATURE_MAX_AGE_MS = parseInt(
  process.env.SIGNATURE_MAX_AGE || "300000",
  10
); // 5 minutes default
const SIGNATURE_ALGORITHM = "sha256";

/**
 * Store of used nonces to prevent replay attacks
 * In production, use Redis or similar
 */
const usedNonces = new Set<string>();

/**
 * Periodic cleanup of old nonces (every 5 minutes)
 */
let nounceCleanupInterval: NodeJS.Timeout | null = null;

function startNonceCleanup(): void {
  if (nounceCleanupInterval) {
    return;
  }

  nounceCleanupInterval = setInterval(() => {
    // In production with Redis, nonces expire automatically
    // For in-memory, clear old nonces periodically
    if (usedNonces.size > 1000) {
      usedNonces.clear();
      logger.debug("Cleared used nonces cache");
    }
  }, 5 * 60 * 1000);
}

/**
 * Generate a random nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generate signature for request
 *
 * Signature = HMAC-SHA256(method + path + body + timestamp + nonce, secret)
 */
export function generateRequestSignature(
  method: string,
  path: string,
  body: string | null,
  timestamp: number,
  nonce: string,
  secret: string = REQUEST_SIGNING_SECRET
): string {
  const message = `${method}|${path}|${body || ""}|${timestamp}|${nonce}`;

  return crypto
    .createHmac(SIGNATURE_ALGORITHM, secret)
    .update(message)
    .digest("hex");
}

/**
 * Create signed request headers
 *
 * Should be called on the client before making sensitive requests
 */
export function createSignedRequestHeaders(
  method: string,
  path: string,
  body: string | null = null,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  if (!REQUEST_SIGNING_ENABLED) {
    return additionalHeaders;
  }

  const timestamp = Date.now();
  const nonce = generateNonce();
  const signature = generateRequestSignature(
    method,
    path,
    body,
    timestamp,
    nonce
  );

  return {
    ...additionalHeaders,
    "x-signature": signature,
    "x-signature-timestamp": timestamp.toString(),
    "x-signature-nonce": nonce,
    "x-signature-algorithm": SIGNATURE_ALGORITHM,
  };
}

/**
 * Verify request signature
 *
 * Returns null if signature is invalid or missing
 */
export function verifyRequestSignature(
  method: string,
  path: string,
  body: string | null,
  signatureHeader: string | null,
  timestampHeader: string | null,
  nonceHeader: string | null,
  secret: string = REQUEST_SIGNING_SECRET
): { valid: boolean; reason?: string } {
  if (!REQUEST_SIGNING_ENABLED) {
    return { valid: true };
  }

  // Check all headers present
  if (!signatureHeader || !timestampHeader || !nonceHeader) {
    return { valid: false, reason: "Missing signature headers" };
  }

  // Parse timestamp
  let timestamp: number;
  try {
    timestamp = parseInt(timestampHeader, 10);
  } catch {
    return { valid: false, reason: "Invalid timestamp format" };
  }

  // Check timestamp freshness
  const now = Date.now();
  if (now - timestamp > SIGNATURE_MAX_AGE_MS) {
    return {
      valid: false,
      reason: "Signature expired",
    };
  }

  if (timestamp > now + 60000) {
    // 1 minute clock skew tolerance
    return {
      valid: false,
      reason: "Signature timestamp in future",
    };
  }

  // Check nonce not used before
  if (usedNonces.has(nonceHeader)) {
    return {
      valid: false,
      reason: "Nonce already used (replay attack detected)",
    };
  }

  // Generate expected signature
  const expectedSignature = generateRequestSignature(
    method,
    path,
    body,
    timestamp,
    nonceHeader,
    secret
  );

  // Compare signatures using constant-time comparison
  const signatureMatch = crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );

  if (!signatureMatch) {
    return {
      valid: false,
      reason: "Signature mismatch",
    };
  }

  // Mark nonce as used
  usedNonces.add(nonceHeader);

  return { valid: true };
}

/**
 * Middleware to verify request signatures
 *
 * @param request Next.js request
 * @param handler Request handler
 * @param requireSignature Whether to require signature (optional, defaults to true)
 *
 * @example
 * ```typescript
 * export async function PUT(request: NextRequest) {
 *   return withRequestSigning(request, async () => {
 *     // Handle request
 *     return NextResponse.json({ success: true });
 *   });
 * }
 * ```
 */
export async function withRequestSigning(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  requireSignature: boolean = true
): Promise<NextResponse> {
  // Skip signature verification for GET requests
  if (request.method === "GET") {
    return handler();
  }

  // Get signature headers
  const signature = request.headers.get("x-signature");
  const timestamp = request.headers.get("x-signature-timestamp");
  const nonce = request.headers.get("x-signature-nonce");

  // Check if signature required but missing
  if (requireSignature && (!signature || !timestamp || !nonce)) {
    logger.warn("Missing request signature", {
      path: new URL(request.url).pathname,
      method: request.method,
    });

    return NextResponse.json(
      { error: "Missing signature" },
      { status: 401 }
    );
  }

  // If signing not required and headers missing, proceed
  if (!requireSignature && (!signature || !timestamp || !nonce)) {
    return handler();
  }

  // Read request body for signature verification
  let body: string | null = null;
  if (request.body) {
    const buffer = await request.arrayBuffer();
    body = Buffer.from(buffer).toString("utf-8");
  }

  const path = new URL(request.url).pathname;
  const method = request.method;

  // Verify signature
  const verification = verifyRequestSignature(
    method,
    path,
    body,
    signature,
    timestamp,
    nonce
  );

  if (!verification.valid) {
    logger.warn("Invalid request signature", {
      path,
      method,
      reason: verification.reason,
    });

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Recreate request with body for handler
  const newRequest = new NextRequest(request);

  return handler();
}

/**
 * Create a signed request for sensitive operations
 *
 * Used in server-to-server communication or sensitive client operations
 */
export async function makeSignedRequest(
  method: string,
  url: string,
  body?: any,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  const bodyString = body ? JSON.stringify(body) : null;

  const headers = createSignedRequestHeaders(
    method,
    path,
    bodyString,
    {
      "Content-Type": "application/json",
      ...additionalHeaders,
    }
  );

  return fetch(url, {
    method,
    headers,
    body: bodyString,
  });
}

/**
 * Start nonce cleanup on module load
 */
startNonceCleanup();

/**
 * Cleanup function for testing
 */
export function stopNonceCleanup(): void {
  if (nounceCleanupInterval) {
    clearInterval(nounceCleanupInterval);
    nounceCleanupInterval = null;
  }
}

/**
 * Clear used nonces (for testing)
 */
export function clearUsedNonces(): void {
  usedNonces.clear();
}

/**
 * Get nonce count (for monitoring)
 */
export function getNonceCount(): number {
  return usedNonces.size;
}
