import {
  sanitizeUsername,
  isPasswordProvider,
  createAuthProfileHelpers,
} from "@/hooks/useAuth.helpers";
import { User } from "firebase/auth";
import { getDoc, runTransaction, setDoc } from "firebase/firestore";

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe("useAuth.helpers", () => {
  const createMockTransaction = (options?: { usernameExists?: boolean }) => {
    const { usernameExists = false } = options ?? {};
    return {
      get: jest.fn().mockResolvedValue({
        exists: () => usernameExists,
        data: () => ({ uid: "uid" }),
      }),
      set: jest.fn(),
      delete: jest.fn(),
    };
  };

  const mockRunTransactionSequence = (
    transactions: ReturnType<typeof createMockTransaction>[]
  ) => {
    (runTransaction as jest.Mock).mockImplementation(
      async (
        _db,
        updateFunction: (
          tx: ReturnType<typeof createMockTransaction>
        ) => Promise<void>
      ) => {
        const tx =
          transactions.shift() ??
          createMockTransaction({ usernameExists: false });
        return updateFunction(tx);
      }
    );
  };

  describe("sanitizeUsername", () => {
    it("sanitizes username correctly", () => {
      expect(sanitizeUsername("  Test User  ")).toBe("testuser");
      expect(sanitizeUsername("User@Name!")).toBe("username");
      expect(sanitizeUsername("user--name")).toBe("user-name");
      expect(sanitizeUsername("user---name")).toBe("user-name");
    });
  });

  describe("isPasswordProvider", () => {
    it("returns true if password provider exists", () => {
      const user = {
        providerData: [{ providerId: "password" }],
      } as User;
      expect(isPasswordProvider(user)).toBe(true);
    });

    it("returns false if password provider does not exist", () => {
      const user = {
        providerData: [{ providerId: "google.com" }],
      } as User;
      expect(isPasswordProvider(user)).toBe(false);
    });

    it("returns false if user is null", () => {
      expect(isPasswordProvider(null)).toBe(false);
    });
  });

  describe("createAuthProfileHelpers", () => {
    const mockDb = {} as any;
    const helpers = createAuthProfileHelpers(mockDb);

    beforeEach(() => {
      jest.clearAllMocks();
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });
      mockRunTransactionSequence([createMockTransaction()]);
    });

    describe("reserveUsername", () => {
      it("throws error for invalid username", async () => {
        await expect(helpers.reserveUsername("uid", "!!")).rejects.toThrow(
          "Usernames must be 3-30 characters"
        );
      });

      it("reserves username successfully", async () => {
        const tx = createMockTransaction({ usernameExists: false });
        mockRunTransactionSequence([tx]);

        const result = await helpers.reserveUsername("uid", "valid-user");
        expect(result).toBe("valid-user");
        expect(getDoc).toHaveBeenCalled();
        expect(tx.set).toHaveBeenCalledTimes(2); // username + profile docs
      });

      it("throws error if username taken", async () => {
        const tx = createMockTransaction({ usernameExists: true });
        mockRunTransactionSequence([tx]);

        await expect(
          helpers.reserveUsername("uid", "taken-user")
        ).rejects.toThrow("This username is already taken");
        expect(tx.set).not.toHaveBeenCalled();
      });
    });

    describe("allocateUsernameForUser", () => {
      it("allocates base username if available", async () => {
        const tx = createMockTransaction({ usernameExists: false });
        mockRunTransactionSequence([tx]);

        await helpers.allocateUsernameForUser("uid", "baseuser");
        expect(getDoc).toHaveBeenCalled();
        expect(tx.set).toHaveBeenCalled();
      });

      it("retries with suffix if taken", async () => {
        const firstTx = createMockTransaction({ usernameExists: true });
        const secondTx = createMockTransaction({ usernameExists: false });
        mockRunTransactionSequence([firstTx, secondTx]);

        await helpers.allocateUsernameForUser("uid", "baseuser");
        expect(firstTx.set).not.toHaveBeenCalled();
        expect(secondTx.set).toHaveBeenCalled();
      });
    });

    describe("ensureUserProfile", () => {
      it("creates profile if not exists and auto-generates username for email/password user", async () => {
        const tx = createMockTransaction({ usernameExists: false });
        mockRunTransactionSequence([tx]);

        const user = {
          uid: "uid",
          email: "test@test.com",
          displayName: "Test User",
          photoURL: "url",
          providerData: [{ providerId: "password" }],
          emailVerified: true,
          getIdToken: jest.fn().mockResolvedValue("token"),
        } as unknown as User;

        const result = await helpers.ensureUserProfile(user);

        expect(result).toEqual({ isNewUser: true, needsUsername: false });
        expect(setDoc).toHaveBeenCalled();
        expect(tx.set).toHaveBeenCalled();
      });

      it("creates profile with needsUsername flag for Google OAuth user", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
          exists: () => false,
          data: () => ({}),
        });

        const user = {
          uid: "uid",
          email: "test@gmail.com",
          displayName: "Test User",
          photoURL: "url",
          providerData: [{ providerId: "google.com" }],
          emailVerified: true,
          getIdToken: jest.fn().mockResolvedValue("token"),
        } as unknown as User;

        const result = await helpers.ensureUserProfile(user);

        expect(result).toEqual({ isNewUser: true, needsUsername: true });
        // Check that setDoc was called with profile data containing needsUsername: true
        expect(setDoc).toHaveBeenCalled();
        const setDocCall = (setDoc as jest.Mock).mock.calls[0];
        expect(setDocCall[1]).toMatchObject({ needsUsername: true });
        expect(setDocCall[2]).toEqual({ merge: true });
        // Should NOT auto-generate username for Google users
        expect(runTransaction).not.toHaveBeenCalled();
      });

      it("does nothing if profile exists with username", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
          exists: () => true,
          data: () => ({ username: "existing" }),
        });

        const user = {
          uid: "uid",
          providerData: [],
          getIdToken: jest.fn().mockResolvedValue("token"),
        } as unknown as User;
        const result = await helpers.ensureUserProfile(user);

        expect(result).toEqual({ isNewUser: false, needsUsername: false });
        expect(setDoc).not.toHaveBeenCalled();
        expect(runTransaction).not.toHaveBeenCalled();
      });
    });

    describe("releaseUsernameReservation", () => {
      it("deletes username and profile", async () => {
        const tx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ uid: "uid" }),
          }),
          delete: jest.fn(),
          set: jest.fn(),
        };
        mockRunTransactionSequence([tx]);

        await helpers.releaseUsernameReservation("uid", "username");
        expect(runTransaction).toHaveBeenCalled();
        expect(tx.delete).toHaveBeenCalled();
      });
    });
  });
});
