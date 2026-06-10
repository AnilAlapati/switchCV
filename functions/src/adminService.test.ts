const mockAuditSet = jest.fn();
const mockWhitelistSet = jest.fn();
const mockUserSet = jest.fn();
const mockSetCustomUserClaims = jest.fn();
const mockGetUserByEmail = jest.fn();
const mockGetUser = jest.fn();

let mockUserRoles: Map<string, string>;
let mockClaims: Map<string, Record<string, unknown>>;

const mockAuth = {
  getUserByEmail: mockGetUserByEmail,
  getUser: mockGetUser,
  setCustomUserClaims: mockSetCustomUserClaims,
};

const mockFirestore = {
  collection: jest.fn((collectionName: string) => {
    if (collectionName === "system") {
      return {
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              set: mockAuditSet,
            })),
          })),
        })),
      };
    }

    if (collectionName === "users") {
      return {
        doc: jest.fn((uid: string) => ({
          get: jest.fn().mockImplementation(async () => ({
            data: () => ({ role: mockUserRoles.get(uid) }),
          })),
          set: mockUserSet.mockImplementation(async (data) => {
            if (typeof data.role === "string") {
              mockUserRoles.set(uid, data.role);
            }
          }),
        })),
      };
    }

    throw new Error(`Unexpected collection: ${collectionName}`);
  }),
};

jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => mockAuth),
  firestore: Object.assign(jest.fn(() => mockFirestore), {
    FieldValue: {
      serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    },
  }),
}));

jest.mock("firebase-functions/v1", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { syncAdminWhitelistHandler } from "./adminService";

function createSnapshot(exists: boolean, data: Record<string, unknown> = {}) {
  return {
    exists,
    data: () => data,
    ref: {
      set: mockWhitelistSet,
    },
  };
}

function createChange(
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
) {
  return {
    before: createSnapshot(beforeData !== null, beforeData ?? {}),
    after: createSnapshot(afterData !== null, afterData ?? {}),
  } as unknown as Parameters<typeof syncAdminWhitelistHandler>[0];
}

const context = {
  eventId: "event-1",
  params: { email: "target@example.com" },
} as unknown as Parameters<typeof syncAdminWhitelistHandler>[1];

describe("syncAdminWhitelistHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRoles = new Map([
      ["approver-uid", "admin"],
      ["target-uid", "jobseeker"],
    ]);
    mockClaims = new Map([
      ["approver-uid", { role: "admin" }],
      ["target-uid", { role: "jobseeker" }],
    ]);

    mockGetUserByEmail.mockResolvedValue({
      uid: "target-uid",
      email: "target@example.com",
      customClaims: mockClaims.get("target-uid"),
    });
    mockGetUser.mockImplementation(async (uid: string) => ({
      uid,
      customClaims: mockClaims.get(uid),
    }));
    mockSetCustomUserClaims.mockImplementation(
      async (uid: string, claims: Record<string, unknown>) => {
        mockClaims.set(uid, claims);
      },
    );
    mockAuditSet.mockResolvedValue(undefined);
    mockWhitelistSet.mockResolvedValue(undefined);
  });

  it("denies grant when whitelist approval fields are missing", async () => {
    await syncAdminWhitelistHandler(createChange(null, {}), context);

    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "grant",
        outcome: "denied",
        reason: "approved must be true",
      }),
      { merge: true },
    );
  });

  it("grants admin after approval by a dual-verified existing admin", async () => {
    await syncAdminWhitelistHandler(
      createChange(null, {
        approved: true,
        approvedByUid: "approver-uid",
        approvedAt: "2026-06-10T00:00:00Z",
      }),
      context,
    );

    expect(mockUserSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "admin",
        roleUpdatedBy: "system",
        roleUpdateSource: "admin_whitelist",
      }),
      { merge: true },
    );
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
      "target-uid",
      expect.objectContaining({ role: "admin" }),
    );
    expect(mockWhitelistSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "granted",
        targetUid: "target-uid",
      }),
      { merge: true },
    );
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({ action: "grant", outcome: "applied" }),
      { merge: true },
    );
  });

  it("does not revoke admin when revoke approval is missing", async () => {
    await syncAdminWhitelistHandler(
      createChange(
        {
          approved: true,
          approvedByUid: "approver-uid",
          approvedAt: "2026-06-10T00:00:00Z",
          status: "granted",
        },
        null,
      ),
      context,
    );

    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "revoke",
        outcome: "denied",
        reason: "revokeApproved must be true",
      }),
      { merge: true },
    );
  });

  it("revokes admin after separate revoke approval", async () => {
    mockUserRoles.set("target-uid", "admin");
    mockClaims.set("target-uid", { role: "admin" });

    await syncAdminWhitelistHandler(
      createChange(
        {
          approved: true,
          approvedByUid: "approver-uid",
          approvedAt: "2026-06-10T00:00:00Z",
          status: "granted",
          revokeApproved: true,
          revokeApprovedByUid: "approver-uid",
          revokeApprovedAt: "2026-06-10T01:00:00Z",
        },
        null,
      ),
      context,
    );

    expect(mockUserSet).toHaveBeenCalledWith(
      expect.objectContaining({ role: "jobseeker" }),
      { merge: true },
    );
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
      "target-uid",
      expect.objectContaining({ role: "jobseeker" }),
    );
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({ action: "revoke", outcome: "applied" }),
      { merge: true },
    );
  });
});
