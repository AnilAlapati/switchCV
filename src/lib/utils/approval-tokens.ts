/**
 * Approval Token Utilities
 *
 * Generates and validates secure one-time tokens for user approval/decline actions.
 * Tokens are stored as hashes in Firestore and expire after use or 7 days.
 */

import { createHash, randomBytes } from "crypto";

export interface ApprovalToken {
  token: string; // The raw token to send in email
  hash: string; // SHA256 hash to store in database
  expiresAt: Date; // Expiration timestamp
}

/**
 * Generate a secure approval token
 * @param action - 'approve' or 'decline'
 * @param requestId - The user approval request ID
 * @returns Token object with raw token, hash, and expiration
 */
export function generateApprovalToken(
  action: "approve" | "decline",
  requestId: string,
): ApprovalToken {
  // Generate 32 bytes of random data (256 bits)
  const randomData = randomBytes(32).toString("hex");

  // Combine with action and requestId for uniqueness
  const token = `${action}_${requestId}_${randomData}`;

  // Create SHA256 hash for storage
  const hash = createHash("sha256").update(token).digest("hex");

  // Token expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    token,
    hash,
    expiresAt,
  };
}

/**
 * Validate an approval token
 * @param token - The raw token from the URL
 * @param storedHash - The hash stored in the database
 * @param storedExpiresAt - The expiration timestamp from database
 * @returns True if token is valid and not expired
 */
export function validateApprovalToken(
  token: string,
  storedHash: string,
  storedExpiresAt: Date,
): boolean {
  // Check if expired
  if (new Date() > storedExpiresAt) {
    return false;
  }

  // Hash the provided token
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Compare hashes (constant-time comparison for security)
  return timingSafeEqual(tokenHash, storedHash);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extract action and requestId from token
 * @param token - The raw token
 * @returns Object with action and requestId, or null if invalid format
 */
export function parseApprovalToken(token: string): {
  action: "approve" | "decline";
  requestId: string;
} | null {
  const parts = token.split("_");

  if (parts.length < 3) {
    return null;
  }

  const action = parts[0];
  const requestId = parts[1];

  if (action !== "approve" && action !== "decline") {
    return null;
  }

  return { action, requestId };
}
