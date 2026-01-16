/**
 * Load/regression tests for the sharded numeric ID generator implementation.
 */

import { ID_GENERATION } from "@/config/constants";
import { adminDb } from "@/lib/firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

const mockShardDoc = jest.fn();
const mockShardOrderBy = jest.fn();

// eslint-disable-next-line prefer-const -- reassigned after jest.mock hoisting
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
const rootDocState: { data: Record<string, unknown> | null } = { data: null };

const buildShardSnapshot = (state?: ShardState) =>
  state ? { exists: true, data: () => ({ ...state }) } : { exists: false };

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

mockShardDoc.mockImplementation((id: string) => createShardRef(Number(id)));

mockShardOrderBy.mockImplementation(() => ({
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
}));

mockDoc.mockImplementation(() => ({
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
}));

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
  getCurrentIdCounter,
  resetIdCounter,
} = require("@/lib/numericIdGenerator");

describe("Numeric Resume ID Generator (load)", () => {
  beforeEach(async () => {
    mockDoc.mockClear();
    mockCollection.mockClear();
    mockRunTransaction.mockClear();
    mockShardDoc.mockClear();
    mockShardOrderBy.mockClear();
    (getRecycledIdFromPool as jest.Mock).mockReset();
    (getRecycledIdFromPool as jest.Mock).mockResolvedValue(null);
    setDefaultTransactionMock();
    shardStates.clear();
    shardRefs.clear();
    rootDocState.data = null;
    await resetIdCounter(0);
  });

  it("issues unique IDs across many sequential requests", async () => {
    const ids = await Promise.all(
      Array.from({ length: 100 }, () => generateNumericResumeId())
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
  });

  it("supports concurrent calls without collisions", async () => {
    const promises = Array.from({ length: 64 }, () =>
      generateNumericResumeId()
    );
    const ids = await Promise.all(promises);

    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBeLessThanOrEqual(ID_GENERATION.MAX_NUMERIC_ID);
  });

  it("keeps getCurrentIdCounter in sync with shard state", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => generateNumericResumeId())
    );

    const snapshot = await getCurrentIdCounter();
    const highestIssued = Math.max(
      ...[...shardStates.values()].map((state) => state.lastIssued)
    );

    expect(snapshot).toBe(highestIssued);
  });

  it("resets shards to provided offset", async () => {
    await resetIdCounter(1_000_000);
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => generateNumericResumeId())
    );

    expect(Math.min(...ids)).toBeGreaterThan(1_000_000);
  });
});
