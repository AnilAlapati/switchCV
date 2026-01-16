/**
 * Tests for idempotency utility
 * @module lib/utils/idempotency.test
 */

import { NextRequest, NextResponse } from "next/server";

// Mock Firebase Admin
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
  delete: mockDelete,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock("@/lib/firebase-admin", () => ({
  __esModule: true,
  default: {
    firestore: {
      Timestamp: {
        now: () => ({ toMillis: () => Date.now() }),
        fromMillis: (ms: number) => ({ toMillis: () => ms }),
      },
    },
  },
  get adminDb() {
    return {
      collection: mockCollection,
    };
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  getIdempotencyKey,
  checkIdempotency,
  markProcessing,
  storeIdempotencyResponse,
  clearIdempotencyKey,
  createCachedResponse,
  createProcessingResponse,
} from "./idempotency";

describe("idempotency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getIdempotencyKey", () => {
    it("should extract idempotency key from headers", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-idempotency-key": "test-key-123",
        },
      });

      expect(getIdempotencyKey(request)).toBe("test-key-123");
    });

    it("should return null when header is not present", () => {
      const request = new NextRequest("http://localhost/api/test");

      expect(getIdempotencyKey(request)).toBeNull();
    });
  });

  describe("checkIdempotency", () => {
    it("should return 'new' when key does not exist", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await checkIdempotency("test-key", "user-123");

      expect(result.status).toBe("new");
      expect(result.key).toBe("test-key");
      expect(mockCollection).toHaveBeenCalledWith("idempotencyKeys");
      expect(mockDoc).toHaveBeenCalledWith("user-123_test-key");
    });

    it("should return 'cached' with data when key exists and completed", async () => {
      const cachedData = { text: "hello", model: "gpt-4" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "test-key",
          userId: "user-123",
          status: "completed",
          response: JSON.stringify(cachedData),
          expiresAt: { toMillis: () => Date.now() + 10000 },
        }),
      });

      const result = await checkIdempotency("test-key", "user-123");

      expect(result.status).toBe("cached");
      expect(result.data).toEqual(cachedData);
    });

    it("should return 'processing' when request is still in progress", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "test-key",
          userId: "user-123",
          status: "processing",
          expiresAt: { toMillis: () => Date.now() + 10000 },
        }),
      });

      const result = await checkIdempotency("test-key", "user-123");

      expect(result.status).toBe("processing");
    });

    it("should return 'new' when record is expired", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "test-key",
          userId: "user-123",
          status: "completed",
          expiresAt: { toMillis: () => Date.now() - 10000 }, // Expired
        }),
      });

      const result = await checkIdempotency("test-key", "user-123");

      expect(result.status).toBe("new");
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should return 'new' on error (fail-open)", async () => {
      mockGet.mockRejectedValueOnce(new Error("Firestore error"));

      const result = await checkIdempotency("test-key", "user-123");

      expect(result.status).toBe("new");
    });
  });

  describe("markProcessing", () => {
    it("should set processing status in Firestore", async () => {
      mockSet.mockResolvedValueOnce(undefined);

      await markProcessing("test-key", "user-123");

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "test-key",
          userId: "user-123",
          status: "processing",
        })
      );
    });
  });

  describe("storeIdempotencyResponse", () => {
    it("should update record with completed status and response", async () => {
      mockUpdate.mockResolvedValueOnce(undefined);
      const response = { text: "hello", model: "gpt-4" };

      await storeIdempotencyResponse("test-key", "user-123", response);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          response: JSON.stringify(response),
        })
      );
    });
  });

  describe("clearIdempotencyKey", () => {
    it("should delete the idempotency record", async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await clearIdempotencyKey("test-key", "user-123");

      expect(mockDelete).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith("user-123_test-key");
    });
  });

  describe("createCachedResponse", () => {
    it("should return JSON response with cached header", () => {
      const data = { success: true };
      const response = createCachedResponse(data);

      expect(response.headers.get("X-Idempotency-Cached")).toBe("true");
      expect(response.status).toBe(200);
    });
  });

  describe("createProcessingResponse", () => {
    it("should return 409 conflict response", () => {
      const response = createProcessingResponse();

      expect(response.status).toBe(409);
    });
  });
});
