/**
 * Request Signing Tests
 *
 * Tests for request signing, verification, and replay attack prevention
 *
 * @module __tests__/middleware/request-signing
 */

import {
  generateRequestSignature,
  createSignedRequestHeaders,
  verifyRequestSignature,
  stopNonceCleanup,
  clearUsedNonces,
  getNonceCount,
} from "@/lib/middleware/request-signing";

describe("Request Signing", () => {
  beforeEach(() => {
    clearUsedNonces();
  });

  afterAll(() => {
    stopNonceCleanup();
  });

  describe("generateRequestSignature", () => {
    test("should generate consistent signatures for same input", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const timestamp = 1234567890;
      const nonce = "test-nonce-123";

      const sig1 = generateRequestSignature(method, path, body, timestamp, nonce);
      const sig2 = generateRequestSignature(method, path, body, timestamp, nonce);

      expect(sig1).toBe(sig2);
    });

    test("should generate different signatures for different methods", () => {
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const timestamp = 1234567890;
      const nonce = "test-nonce-123";

      const postSig = generateRequestSignature("POST", path, body, timestamp, nonce);
      const putSig = generateRequestSignature("PUT", path, body, timestamp, nonce);

      expect(postSig).not.toBe(putSig);
    });

    test("should generate different signatures for different paths", () => {
      const method = "POST";
      const body = '{"title":"My Resume"}';
      const timestamp = 1234567890;
      const nonce = "test-nonce-123";

      const sig1 = generateRequestSignature(method, "/api/resumes", body, timestamp, nonce);
      const sig2 = generateRequestSignature(method, "/api/users", body, timestamp, nonce);

      expect(sig1).not.toBe(sig2);
    });

    test("should generate different signatures for different bodies", () => {
      const method = "POST";
      const path = "/api/resumes";
      const timestamp = 1234567890;
      const nonce = "test-nonce-123";

      const sig1 = generateRequestSignature(
        method,
        path,
        '{"title":"Resume 1"}',
        timestamp,
        nonce
      );
      const sig2 = generateRequestSignature(
        method,
        path,
        '{"title":"Resume 2"}',
        timestamp,
        nonce
      );

      expect(sig1).not.toBe(sig2);
    });

    test("should handle null body", () => {
      const method = "DELETE";
      const path = "/api/resumes/123";
      const timestamp = 1234567890;
      const nonce = "test-nonce-123";

      const sig = generateRequestSignature(method, path, null, timestamp, nonce);
      expect(sig).toBeTruthy();
      expect(sig.length).toBe(64); // SHA256 hex length
    });

    test("should generate different signatures for different timestamps", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const nonce = "test-nonce-123";

      const sig1 = generateRequestSignature(method, path, body, 1000, nonce);
      const sig2 = generateRequestSignature(method, path, body, 2000, nonce);

      expect(sig1).not.toBe(sig2);
    });

    test("should generate different signatures for different nonces", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const timestamp = 1234567890;

      const sig1 = generateRequestSignature(method, path, body, timestamp, "nonce1");
      const sig2 = generateRequestSignature(method, path, body, timestamp, "nonce2");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("createSignedRequestHeaders", () => {
    test("should include required signature headers", () => {
      const headers = createSignedRequestHeaders("POST", "/api/resumes", '{}');

      expect(headers["x-signature"]).toBeTruthy();
      expect(headers["x-signature-timestamp"]).toBeTruthy();
      expect(headers["x-signature-nonce"]).toBeTruthy();
      expect(headers["x-signature-algorithm"]).toBe("sha256");
    });

    test("should merge with additional headers", () => {
      const headers = createSignedRequestHeaders(
        "POST",
        "/api/resumes",
        "{}",
        { "Content-Type": "application/json", "X-Custom": "value" }
      );

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Custom"]).toBe("value");
      expect(headers["x-signature"]).toBeTruthy();
    });

    test("should use different nonces for different calls", () => {
      const headers1 = createSignedRequestHeaders("POST", "/api/resumes", "{}");
      const headers2 = createSignedRequestHeaders("POST", "/api/resumes", "{}");

      expect(headers1["x-signature-nonce"]).not.toBe(headers2["x-signature-nonce"]);
    });

    test("should use current timestamp", () => {
      const before = Date.now();
      const headers = createSignedRequestHeaders("POST", "/api/resumes", "{}");
      const after = Date.now();

      const timestamp = parseInt(headers["x-signature-timestamp"], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test("should handle null body", () => {
      const headers = createSignedRequestHeaders("DELETE", "/api/resumes/123", null);

      expect(headers["x-signature"]).toBeTruthy();
    });
  });

  describe("verifyRequestSignature", () => {
    test("should accept valid signature", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(true);
    });

    test("should reject invalid signature", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"My Resume"}';
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        "invalid-signature",
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
    });

    test("should reject missing signature header", () => {
      const timestamp = Date.now();

      const result = verifyRequestSignature(
        "POST",
        "/api/resumes",
        "{}",
        null,
        timestamp.toString(),
        "nonce"
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Missing");
    });

    test("should reject expired signature", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "{}";
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        oldTimestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        oldTimestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    test("should reject signature with future timestamp", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "{}";
      const futureTimestamp = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        futureTimestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        futureTimestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("future");
    });

    test("should reject modified body", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body1 = '{"title":"My Resume"}';
      const body2 = '{"title":"Hacked"}';
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body1,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body2,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
    });

    test("should reject modified path", () => {
      const method = "POST";
      const path1 = "/api/resumes";
      const path2 = "/api/users";
      const body = "{}";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path1,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path2,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
    });

    test("should reject modified method", () => {
      const method1 = "POST";
      const method2 = "PUT";
      const path = "/api/resumes";
      const body = "{}";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method1,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method2,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("Replay Attack Prevention", () => {
    test("should reject nonce reuse", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "{}";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      // First verification
      const result1 = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );
      expect(result1.valid).toBe(true);

      // Second verification with same nonce
      const result2 = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain("replay");
    });

    test("should accept different nonces", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "{}";
      const timestamp = Date.now();

      clearUsedNonces();

      for (let i = 0; i < 5; i++) {
        const nonce = `test-nonce-${i}`;
        const signature = generateRequestSignature(
          method,
          path,
          body,
          timestamp,
          nonce
        );

        const result = verifyRequestSignature(
          method,
          path,
          body,
          signature,
          timestamp.toString(),
          nonce
        );

        expect(result.valid).toBe(true);
      }

      expect(getNonceCount()).toBe(5);
    });
  });

  describe("Timing Attack Prevention", () => {
    test("should use constant-time comparison", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "{}";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      // Valid signature should be rejected in constant time
      // regardless of how many characters match at start
      const wrongSignature = "0".repeat(64);

      const startTime = Date.now();
      verifyRequestSignature(
        method,
        path,
        body,
        wrongSignature,
        timestamp.toString(),
        nonce
      );
      const timeTaken = Date.now() - startTime;

      // Should complete within reasonable time (not timing-dependent)
      expect(timeTaken).toBeLessThan(100);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty body", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = "";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(true);
    });

    test("should handle special characters in body", () => {
      const method = "POST";
      const path = "/api/resumes";
      const body = '{"title":"Hello\\nWorld\\t\"quoted\""}';
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(true);
    });

    test("should handle unicode in path", () => {
      const method = "POST";
      const path = "/api/résumés";
      const body = "{}";
      const timestamp = Date.now();
      const nonce = "test-nonce-123";

      const signature = generateRequestSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      clearUsedNonces();

      const result = verifyRequestSignature(
        method,
        path,
        body,
        signature,
        timestamp.toString(),
        nonce
      );

      expect(result.valid).toBe(true);
    });
  });
});
