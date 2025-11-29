/**
 * Tests for lib/numericIdGenerator utility (sharded counter implementation)
 */

import { ID_GENERATION } from "@/config/constants";
import { adminDb } from "@/lib/firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

const mockShardDoc = jest.fn();
const mockShardOrderBy = jest.fn();

// eslint-disable-next-line prefer-const -- reassigned post jest.mock hoisting
let mockShardCollectionRef: {
  doc: typeof mockShardDoc;
  orderBy: typeof mockShardOrderBy;
};

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    doc: jest.fn(),
    collection: jest.fn().mockImplementation(() => mockShardCollectionRef),
    runTransaction: jest.fn(),
  },
}));

jest.mock("@/lib/resumeIdRecycler", () => ({
  getRecycledIdFromPool: jest.fn(),
}));

mockShardCollectionRef = {
  doc: mockShardDoc,
  orderBy: mockShardOrderBy,
};

const mockDoc = adminDb.doc as jest.Mock;
const mockCollection = adminDb.collection as jest.Mock;
const mockRunTransaction = adminDb.runTransaction as jest.Mock;
const mockGetRecycledIdFromPool = getRecycledIdFromPool as jest.MockedFunction<
  typeof getRecycledIdFromPool
>;

interface ShardState {
  shardId: number;
  nextId: number;
  lastIssued: number;
  updatedAt?: string;
  createdAt?: string;
}

const shardStates = new Map<number, ShardState>();
const shardRefs = new Map<number, any>();

const buildShardSnapshot = (state: ShardState | undefined) =>
  state
    ? {
        exists: true,
        data: () => ({ ...state }),
      }
    : { exists: false };

const upsertShardState = (
  shardId: number,
  data: Partial<ShardState>,
  overwrite = false
) => {
  const current = shardStates.get(shardId);
  const next = overwrite
    ? ({ shardId, ...data } as ShardState)
    : ({ ...current, ...data, shardId } as ShardState);
  shardStates.set(shardId, next);
};

const createShardRef = (shardId: number) => {
  if (shardRefs.has(shardId)) {
    return shardRefs.get(shardId);
  }

  const ref = {
    shardId,
    get: jest
      .fn()
      .mockImplementation(async () =>
        buildShardSnapshot(shardStates.get(shardId))
      ),
    set: jest
      .fn()
      .mockImplementation(
        async (data: ShardState, options?: { merge?: boolean }) => {
          upsertShardState(shardId, data, !options?.merge);
        }
      ),
    update: jest.fn().mockImplementation(async (data: Partial<ShardState>) => {
      upsertShardState(shardId, data);
    }),
  };

  shardRefs.set(shardId, ref);
  return ref;
};

const rootDocState: { data: Record<string, unknown> | null } = { data: null };
const rootDocRef = {
  get: jest
    .fn()
    .mockImplementation(async () =>
      rootDocState.data
        ? { exists: true, data: () => ({ ...rootDocState.data }) }
        : { exists: false }
    ),
  set: jest
    .fn()
    .mockImplementation(
      async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
        rootDocState.data =
          options?.merge && rootDocState.data
            ? { ...rootDocState.data, ...data }
            : { ...data };
      }
    ),
};

const configureOrderByChain = () => ({
  limit: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation(async () => {
      if (!shardStates.size) {
        return { empty: true, docs: [] };
      }
      const top = [...shardStates.values()].sort(
        (a, b) => (b.lastIssued || 0) - (a.lastIssued || 0)
      )[0];
      return {
        empty: false,
        docs: [
          {
            data: () => ({ ...top }),
          },
        ],
      };
    }),
  })),
});

mockShardOrderBy.mockImplementation(configureOrderByChain);

mockShardDoc.mockImplementation((id: string) => createShardRef(Number(id)));

mockDoc.mockImplementation((path: string) => {
  if (path === ID_GENERATION.COUNTER_DOC_PATH) {
    return rootDocRef;
  }
  throw new Error(`Unexpected doc path ${path}`);
});

let transactionChain: Promise<unknown> = Promise.resolve();

const setDefaultTransactionMock = () => {
  transactionChain = Promise.resolve();
  mockRunTransaction.mockImplementation((callback) => {
    transactionChain = transactionChain.then(() => {
      const txn = {
        get: jest.fn().mockImplementation((ref) => ref.get()),
        update: jest.fn().mockImplementation((ref, data) => ref.update(data)),
        set: jest.fn().mockImplementation((ref, data) => ref.set(data)),
      };
      return callback(txn);
    });
    return transactionChain;
  });
};

setDefaultTransactionMock();

const {
  generateNumericResumeId,
  initializeIdCounter,
  getCurrentIdCounter,
  resetIdCounter,
} = require("@/lib/numericIdGenerator");

describe("Numeric ID Generator (sharded)", () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockCollection.mockClear();
    mockRunTransaction.mockClear();
    mockShardDoc.mockClear();
    mockShardOrderBy.mockClear();
    rootDocRef.get.mockClear();
    rootDocRef.set.mockClear();
    mockGetRecycledIdFromPool.mockReset();
    mockGetRecycledIdFromPool.mockResolvedValue(null);
    setDefaultTransactionMock();
    rootDocState.data = null;
    shardStates.clear();
    shardRefs.clear();
  });

  describe("initializeIdCounter", () => {
    it("initializes metadata and shards when absent", async () => {
      await initializeIdCounter();

      expect(rootDocRef.set).toHaveBeenCalledWith({
        createdAt: expect.any(String),
        lastResetAt: expect.any(String),
      });
      expect(shardStates.size).toBe(ID_GENERATION.SHARD_COUNT);
      expect(shardRefs.size).toBe(ID_GENERATION.SHARD_COUNT);
    });

    it("is idempotent when metadata already exists", async () => {
      rootDocState.data = { createdAt: "old", lastResetAt: "old" };

      await initializeIdCounter();

      // root doc set called only when shards missing (merge path not triggered)
      expect(rootDocRef.set).not.toHaveBeenCalled();
      expect(shardStates.size).toBe(ID_GENERATION.SHARD_COUNT);
    });
  });

  describe("generateNumericResumeId", () => {
    beforeEach(async () => {
      await initializeIdCounter();
    });

    it("returns a recycled ID when available", async () => {
      mockGetRecycledIdFromPool.mockResolvedValueOnce(99);

      const id = await generateNumericResumeId();

      expect(id).toBe(99);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
    });

    it("allocates IDs from deterministic shard when no recycled ID exists", async () => {
      mockGetRecycledIdFromPool.mockResolvedValueOnce(null);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);

      const id = await generateNumericResumeId();

      expect(id).toBe(1); // shard 0 starts at 1
      expect(shardStates.get(0)?.lastIssued).toBe(1);
      randomSpy.mockRestore();
    });

    it("increments shard by SHARD_COUNT for subsequent allocations", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      const randomSpy = jest.spyOn(Math, "random");
      randomSpy.mockReturnValue(0);

      const first = await generateNumericResumeId();
      const second = await generateNumericResumeId();

      expect(first).toBe(1);
      expect(second).toBe(1 + ID_GENERATION.SHARD_COUNT);
      randomSpy.mockRestore();
    });

    it("retries on transient shard failures", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);

      let attempt = 0;
      mockRunTransaction.mockImplementation(async (callback) => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error("fail shard");
        }
        const txn = {
          get: jest.fn().mockImplementation((ref) => ref.get()),
          update: jest.fn().mockImplementation((ref, data) => ref.update(data)),
          set: jest.fn().mockImplementation((ref, data) => ref.set(data)),
        };
        return callback(txn);
      });

      const id = await generateNumericResumeId();
      expect(id).toBeGreaterThan(0);
      expect(attempt).toBeGreaterThan(1);
    });

    it("throws when all shard retries fail", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockRunTransaction.mockRejectedValue(new Error("permanent"));

      await expect(generateNumericResumeId()).rejects.toThrow(
        "Failed to allocate numeric ID from any shard"
      );
    });
  });

  describe("getCurrentIdCounter", () => {
    it("returns 0 when no shards issued IDs", async () => {
      shardStates.clear();
      const result = await getCurrentIdCounter();
      expect(result).toBe(0);
    });

    it("returns the highest lastIssued value", async () => {
      await initializeIdCounter();
      shardStates.set(0, {
        shardId: 0,
        nextId: 65,
        lastIssued: 33,
      });
      shardStates.set(1, {
        shardId: 1,
        nextId: 66,
        lastIssued: 99,
      });

      const result = await getCurrentIdCounter();
      expect(result).toBe(99);
    });
  });

  describe("resetIdCounter", () => {
    it("resets metadata and shards to the provided offset", async () => {
      await initializeIdCounter();
      await resetIdCounter(500);

      shardStates.forEach((state) => {
        expect(state.lastIssued).toBe(500);
        expect(state.nextId).toBeGreaterThan(500);
      });
      expect(rootDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastResetAt: expect.any(String),
          resetTo: 500,
        }),
        { merge: true }
      );
    });
  });
});
