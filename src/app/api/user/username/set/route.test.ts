import { NextRequest } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import {
  collectionRef,
  COLLECTIONS,
  runTransaction,
  serverTimestamp,
} from "@/lib/dal";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) =>
    Response.json({ error: message, details: error?.message }, { status }),
  ),
}));

jest.mock("@/lib/dal", () => ({
  collectionRef: jest.fn(),
  COLLECTIONS: {
    USERNAMES: "usernames",
    USERS: "users",
  },
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe("POST /api/user/username/set", () => {
  const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };
  const usernameRef = { collection: COLLECTIONS.USERNAMES, id: "new-user" };
  const userRef = { collection: COLLECTIONS.USERS, id: "user-123" };

  beforeEach(() => {
    jest.clearAllMocks();

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });
    (serverTimestamp as jest.Mock).mockReturnValue("SERVER_TIMESTAMP");
    (collectionRef as jest.Mock).mockImplementation((collection: string) => ({
      doc: (id: string) => ({ collection, id }),
    }));
    (runTransaction as jest.Mock).mockImplementation(
      async (
        callback: (transaction: typeof mockTransaction) => Promise<unknown>,
      ) => callback(mockTransaction),
    );
    mockTransaction.get.mockImplementation(async (ref: typeof usernameRef) => {
      if (ref.collection === COLLECTIONS.USERNAMES) {
        return { exists: false };
      }

      return {
        exists: true,
        data: () => ({ approvalStatus: "approved" }),
      };
    });
  });

  it("rejects username claims while approval is still pending", async () => {
    mockTransaction.get.mockImplementation(async (ref: typeof usernameRef) => {
      if (ref.collection === COLLECTIONS.USERNAMES) {
        return { exists: false };
      }

      return {
        exists: true,
        data: () => ({ approvalStatus: "pending" }),
      };
    });

    const response = await POST(
      new NextRequest("http://localhost/api/user/username/set", {
        method: "POST",
        body: JSON.stringify({ username: "new-user" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Your account is still pending approval.");
    expect(mockTransaction.set).not.toHaveBeenCalled();
    expect(mockTransaction.update).not.toHaveBeenCalled();
  });

  it("rejects username claims for declined or disabled accounts", async () => {
    mockTransaction.get.mockImplementation(async (ref: typeof usernameRef) => {
      if (ref.collection === COLLECTIONS.USERNAMES) {
        return { exists: false };
      }

      return {
        exists: true,
        data: () => ({ approvalStatus: "declined", accountDisabled: true }),
      };
    });

    const response = await POST(
      new NextRequest("http://localhost/api/user/username/set", {
        method: "POST",
        body: JSON.stringify({ username: "new-user" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Your account is not eligible to claim a username.");
    expect(mockTransaction.set).not.toHaveBeenCalled();
    expect(mockTransaction.update).not.toHaveBeenCalled();
  });

  it("claims the username for approved users", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/user/username/set", {
        method: "POST",
        body: JSON.stringify({ username: "new-user" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, username: "new-user" });
    expect(mockTransaction.set).toHaveBeenCalledWith(usernameRef, {
      uid: "user-123",
      createdAt: "SERVER_TIMESTAMP",
    });
    expect(mockTransaction.update).toHaveBeenCalledWith(userRef, {
      username: "new-user",
      needsUsername: false,
      updatedAt: "SERVER_TIMESTAMP",
    });
  });
});
