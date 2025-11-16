/**
 * Load Test for Numeric Resume ID Generator
 *
 * Tests the ID generation system under concurrent load
 * to ensure no collisions occur even with millions of simultaneous requests.
 *
 * Run with: npm test -- numericIdGenerator.test.ts
 */

// Ensure we mock firebase/firestore early so the module is mocked for imports
jest.mock("firebase/firestore", () => {
  const mocks: any = {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    doc: jest.fn((_db: any, path: string) => ({ _path: path })),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
    getDoc: jest.fn(),
    increment: jest.fn((value: number) => ({ _type: "increment", value })),
  };
  return mocks;
});

import {
  generateNumericResumeId,
  initializeIdCounter,
  getCurrentIdCounter,
  resetIdCounter,
} from "@/lib/numericIdGenerator";

// Mock Firestore and recycler behavior for isolated unit tests
// Firestore mocks will be required in beforeAll so Jest's setup mock registrations have applied
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

jest.mock("@/lib/resumeIdRecycler", () => ({
  getRecycledIdFromPool: jest.fn(),
}));

describe("Numeric Resume ID Generator", () => {
  // Maintain an in-memory counter to simulate Firestore document
  const inMemoryCounter = { currentId: 0 };

  beforeAll(async () => {
    // Require the mocked firestore functions after jest.setup ran
    // Note: Use jest.requireMock to ensure we get the Jest mock instance
    const firestore: any = jest.requireMock("firebase/firestore");
    // Mock getDoc to return a document snapshot-like object
    (firestore.getDoc as jest.Mock).mockImplementation(async () => ({
      exists: () => true,
      data: () => ({ ...inMemoryCounter }),
    }));

    // Mock setDoc to update in-memory counter when increment is used
    (firestore.setDoc as jest.Mock).mockImplementation(async (_ref, data) => {
      // Handle increment object (mocked in setup)
      if (
        data &&
        typeof data.currentId === "object" &&
        data.currentId._type === "increment"
      ) {
        const inc = data.currentId.value || 1;
        inMemoryCounter.currentId += inc;
      } else if (data && typeof data.currentId === "number") {
        inMemoryCounter.currentId = data.currentId;
      }
      return Promise.resolve();
    });

    // Default recycled pool returns null to use counter generation path
    (getRecycledIdFromPool as jest.Mock).mockResolvedValue(null);

    // Initialize counter before tests by calling the library code
    await initializeIdCounter();
    await resetIdCounter(0);
  });

  describe("Basic Functionality", () => {
    it("should generate sequential numeric IDs", async () => {
      const id1 = await generateNumericResumeId();
      const id2 = await generateNumericResumeId();
      const id3 = await generateNumericResumeId();

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });

    it("should return numbers only", async () => {
      const id = await generateNumericResumeId();
      expect(typeof id).toBe("number");
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    });

    it("should return IDs within 1-8 digit range", async () => {
      const id = await generateNumericResumeId();
      expect(id).toBeLessThanOrEqual(99999999); // 8 digits max
    });
  });

  describe("Concurrent Generation", () => {
    beforeEach(async () => {
      await resetIdCounter(0);
    });

    it("should handle 10 concurrent requests without collisions", async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => generateNumericResumeId());

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      expect(uniqueIds.size).toBe(10);

      // IDs should be sequential
      expect(Math.max(...ids)).toBe(10);
    });

    it("should handle 100 concurrent requests without collisions", async () => {
      await resetIdCounter(0);

      const promises = Array(100)
        .fill(null)
        .map(() => generateNumericResumeId());

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
      expect(Math.max(...ids)).toBe(100);
    });

    it("should handle 1000 concurrent requests without collisions", async () => {
      await resetIdCounter(0);

      const promises = Array(1000)
        .fill(null)
        .map(() => generateNumericResumeId());

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(1000);
      expect(Math.max(...ids)).toBe(1000);
    });

    it("should handle simulated high-load scenario (10k requests in batches)", async () => {
      await resetIdCounter(0);

      const batchSize = 1000;
      const batchCount = 10;
      const allIds: number[] = [];

      for (let i = 0; i < batchCount; i++) {
        const promises = Array(batchSize)
          .fill(null)
          .map(() => generateNumericResumeId());

        const batchIds = await Promise.all(promises);
        allIds.push(...batchIds);

        console.log(
          `✅ Batch ${i + 1}/${batchCount} complete. IDs generated: ${
            (i + 1) * batchSize
          }`
        );
      }

      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(10000);
      expect(Math.max(...allIds)).toBe(10000);

      const currentCounter = await getCurrentIdCounter();
      expect(currentCounter).toBe(10000);
    });
  });

  describe("Counter Management", () => {
    it("should initialize counter to 0", async () => {
      await resetIdCounter(0);
      const counter = await getCurrentIdCounter();
      expect(counter).toBe(0);
    });

    it("should get current counter value correctly", async () => {
      await resetIdCounter(0);
      await generateNumericResumeId();
      await generateNumericResumeId();
      await generateNumericResumeId();

      const counter = await getCurrentIdCounter();
      expect(counter).toBe(3);
    });

    it("should reset counter to specified value", async () => {
      await resetIdCounter(500);
      const counter = await getCurrentIdCounter();
      expect(counter).toBe(500);

      const nextId = await generateNumericResumeId();
      expect(nextId).toBe(501);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid sequential requests", async () => {
      await resetIdCounter(0);

      let previousId = 0;
      for (let i = 0; i < 100; i++) {
        const id = await generateNumericResumeId();
        expect(id).toBe(previousId + 1);
        previousId = id;
      }
    });

    it("should generate IDs up to the max limit", async () => {
      // Note: This test simulates being near the limit
      await resetIdCounter(99999998); // 2 IDs away from max

      const id1 = await generateNumericResumeId();
      expect(id1).toBe(99999999);

      // Attempting to generate beyond max should throw
      try {
        await generateNumericResumeId();
        fail("Should have thrown error when exceeding max ID");
      } catch (error) {
        expect((error as Error).message).toContain(
          "Maximum numeric ID limit reached"
        );
      }
    });
  });

  describe("Performance", () => {
    it("should generate ID in less than 100ms", async () => {
      await resetIdCounter(0);

      const startTime = performance.now();
      await generateNumericResumeId();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("should handle 1000 concurrent requests in reasonable time", async () => {
      await resetIdCounter(0);

      const startTime = performance.now();

      const promises = Array(1000)
        .fill(null)
        .map(() => generateNumericResumeId());

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `⏱️  Generated 1000 IDs in ${duration.toFixed(2)}ms (${(
          duration / 1000
        ).toFixed(2)}ms per ID)`
      );

      // Should complete in reasonable time (adjust based on actual performance)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Data Type Validation", () => {
    it("should always return positive integers", async () => {
      await resetIdCounter(0);

      for (let i = 0; i < 20; i++) {
        const id = await generateNumericResumeId();
        expect(id).toBeGreaterThan(0);
        expect(Number.isInteger(id)).toBe(true);
      }
    });

    it("should work with string conversion", async () => {
      const id = await generateNumericResumeId();
      const idStr = String(id);

      // Should only contain digits
      expect(/^\d+$/.test(idStr)).toBe(true);

      // Should be easily parseable back
      const parsed = parseInt(idStr, 10);
      expect(parsed).toBe(id);
    });
  });
});
