import crypto from "crypto";

/**
 * Secure Token Generator for PII Access
 * Generates and validates JWT-like tokens for time-limited PII access
 */

export interface TokenPayload {
  tokenId: string;
  recruiterId: string;
  userId: string;
  resumeId: string;
  requestId: string;
  accessFields: string[];
  issuedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  iat?: number;
  exp?: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

class TokenGenerator {
  private secret: string;
  private algorithm = "HS256";

  constructor(secret?: string) {
    // Use environment variable or fallback for development
    this.secret =
      secret || process.env.TOKEN_SECRET || "development-secret-key";
    if (!process.env.TOKEN_SECRET && !secret) {
      console.warn(
        "⚠️  TOKEN_SECRET not configured. Using development secret. Set TOKEN_SECRET in .env.local for production."
      );
    }
  }

  /**
   * Generate a secure token for recruiter PII access
   */
  generateToken(payload: Partial<TokenPayload>): {
    token: string;
    tokenHash: string;
    expiresAt: number;
  } {
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const tokenId = crypto.randomUUID();

    const fullPayload: TokenPayload = {
      tokenId,
      recruiterId: payload.recruiterId || "",
      userId: payload.userId || "",
      resumeId: payload.resumeId || "",
      requestId: payload.requestId || "",
      accessFields: payload.accessFields || [],
      issuedAt: now,
      expiresAt: payload.expiresAt || now + 7 * 24 * 60 * 60, // Default 7 days
      iat: now,
      exp: payload.expiresAt || now + 7 * 24 * 60 * 60,
    };

    // Create JWT-like token
    const header = this.base64urlEncode(
      JSON.stringify({ alg: this.algorithm, typ: "JWT" })
    );
    const body = this.base64urlEncode(JSON.stringify(fullPayload));

    // Sign with HMAC
    const signature = this.sign(`${header}.${body}`);

    const token = `${header}.${body}.${signature}`;
    const tokenHash = this.hashToken(token);

    return {
      token,
      tokenHash,
      expiresAt: fullPayload.expiresAt,
    };
  }

  /**
   * Verify a token and return its payload
   */
  verifyToken(token: string): TokenVerificationResult {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return {
          valid: false,
          error: "Invalid token format",
        };
      }

      const [header, body, signature] = parts;

      // Verify signature
      const expectedSignature = this.sign(`${header}.${body}`);
      if (signature !== expectedSignature) {
        return {
          valid: false,
          error: "Invalid signature",
        };
      }

      // Decode payload
      const payloadStr = this.base64urlDecode(body);
      const payload: TokenPayload = JSON.parse(payloadStr);

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.expiresAt < now) {
        return {
          valid: false,
          error: "Token expired",
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify token hash (for storage verification)
   */
  verifyTokenHash(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }

  /**
   * Check if token is expired
   */
  isExpired(expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return expiresAt <= now;
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime(expiresAt: number): number {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;
    return Math.max(0, remaining);
  }

  /**
   * Get human-readable time remaining
   */
  getReadableTimeRemaining(expiresAt: number): string {
    const remaining = this.getRemainingTime(expiresAt);

    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Private helper: Base64url encode
   */
  private base64urlEncode(str: string): string {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Private helper: Base64url decode
   */
  private base64urlDecode(str: string): string {
    // Add padding
    str += "=".repeat(4 - (str.length % 4));
    return Buffer.from(
      str.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  }

  /**
   * Private helper: Sign with HMAC
   */
  private sign(message: string): string {
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(message);
    return this.base64urlEncode(hmac.digest().toString());
  }

  /**
   * Private helper: Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

// Export singleton instance
export const tokenGenerator = new TokenGenerator();
export default TokenGenerator;
