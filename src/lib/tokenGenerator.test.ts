/**
 * Tests for lib/tokenGenerator utility
 */

import TokenGenerator, { tokenGenerator } from "@/lib/tokenGenerator";

describe("TokenGenerator Utility", () => {
  let generator: TokenGenerator;

  beforeEach(() => {
    generator = new TokenGenerator("test-secret");
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z").getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("generateToken", () => {
    it("should generate a valid token", () => {
      const result = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: ["email", "phone"],
      });

      expect(result.token).toBeDefined();
      expect(result.tokenHash).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.token.split(".")).toHaveLength(3);
    });

    it("should set default expiration to 7 days", () => {
      const result = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const issuedAt = Math.floor(
        new Date("2024-01-01T00:00:00Z").getTime() / 1000,
      );
      const expectedExpiry = issuedAt + sevenDaysInSeconds;

      expect(result.expiresAt).toBe(expectedExpiry);
    });

    it("should use custom expiration if provided", () => {
      const customExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const result = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
        expiresAt: customExpiry,
      });

      expect(result.expiresAt).toBe(customExpiry);
    });

    it("should include tokenId", () => {
      const result = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const verification = generator.verifyToken(result.token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.tokenId).toBeDefined();
    });

    it("should include access fields", () => {
      const accessFields = ["email", "phone", "linkedin"];
      const result = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields,
      });

      const verification = generator.verifyToken(result.token);
      expect(verification.payload?.accessFields).toEqual(accessFields);
    });

    it("should generate unique tokens", () => {
      const result1 = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const result2 = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      expect(result1.token).not.toBe(result2.token);
      expect(result1.tokenHash).not.toBe(result2.tokenHash);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const generated = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: ["email"],
      });

      const result = generator.verifyToken(generated.token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid token format", () => {
      const result = generator.verifyToken("invalid.token");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid token format");
    });

    it("should reject token with wrong signature", () => {
      const generated = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const parts = generated.token.split(".");
      const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;

      const result = generator.verifyToken(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid signature");
    });

    it("should reject expired token", () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 100; // Expires in future
      const generated = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
        expiresAt,
      });

      // Move time forward past expiration
      jest.advanceTimersByTime(101000);

      const result = generator.verifyToken(generated.token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should preserve payload data", () => {
      const payload = {
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: ["email", "phone"],
      };

      const generated = generator.generateToken(payload);
      const result = generator.verifyToken(generated.token);

      expect(result.payload?.recruiterId).toBe(payload.recruiterId);
      expect(result.payload?.userId).toBe(payload.userId);
      expect(result.payload?.resumeId).toBe(payload.resumeId);
      expect(result.payload?.requestId).toBe(payload.requestId);
      expect(result.payload?.accessFields).toEqual(payload.accessFields);
    });
  });

  describe("verifyTokenHash", () => {
    it("should verify token hash", () => {
      const generated = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const isValid = generator.verifyTokenHash(
        generated.token,
        generated.tokenHash,
      );

      expect(isValid).toBe(true);
    });

    it("should reject wrong hash", () => {
      const generated = generator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      const isValid = generator.verifyTokenHash(generated.token, "wrong-hash");

      expect(isValid).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should return false for future expiration", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

      expect(generator.isExpired(futureExpiry)).toBe(false);
    });

    it("should return true for past expiration", () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;

      expect(generator.isExpired(pastExpiry)).toBe(true);
    });

    it("should return true for current time", () => {
      const nowExpiry = Math.floor(Date.now() / 1000);

      expect(generator.isExpired(nowExpiry)).toBe(true);
    });
  });

  describe("getRemainingTime", () => {
    it("should return remaining time in seconds", () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 7200; // 2 hours

      const remaining = generator.getRemainingTime(expiresAt);

      expect(remaining).toBe(7200);
    });

    it("should return 0 for expired tokens", () => {
      const expiresAt = Math.floor(Date.now() / 1000) - 1000;

      const remaining = generator.getRemainingTime(expiresAt);

      expect(remaining).toBe(0);
    });
  });

  describe("getReadableTimeRemaining", () => {
    it("should return 'Expired' for past dates", () => {
      const expiresAt = Math.floor(Date.now() / 1000) - 1000;

      const readable = generator.getReadableTimeRemaining(expiresAt);

      expect(readable).toBe("Expired");
    });

    it("should return days for long durations", () => {
      const expiresAt =
        Math.floor(Date.now() / 1000) + 5 * 24 * 3600 + 3 * 3600; // 5 days 3 hours

      const readable = generator.getReadableTimeRemaining(expiresAt);

      expect(readable).toContain("d");
      expect(readable).toContain("h");
    });

    it("should return hours and minutes", () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 2 * 3600 + 30 * 60; // 2h 30m

      const readable = generator.getReadableTimeRemaining(expiresAt);

      expect(readable).toContain("h");
      expect(readable).toContain("m");
    });

    it("should return minutes and seconds", () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60 + 30; // 5m 30s

      const readable = generator.getReadableTimeRemaining(expiresAt);

      expect(readable).toContain("m");
      expect(readable).toContain("s");
    });

    it("should return only seconds for short durations", () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 45; // 45 seconds

      const readable = generator.getReadableTimeRemaining(expiresAt);

      expect(readable).toContain("s");
    });
  });

  describe("Singleton instance", () => {
    it("should export singleton tokenGenerator", () => {
      expect(tokenGenerator).toBeDefined();
      expect(tokenGenerator).toBeInstanceOf(TokenGenerator);
    });

    it("should generate valid tokens from singleton", () => {
      const result = tokenGenerator.generateToken({
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        requestId: "request-000",
        accessFields: [],
      });

      expect(result.token).toBeDefined();
      const verification = tokenGenerator.verifyToken(result.token);
      expect(verification.valid).toBe(true);
    });
  });
});
