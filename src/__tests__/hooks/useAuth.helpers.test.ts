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
    });

    describe("reserveUsername", () => {
      it("throws error for invalid username", async () => {
        await expect(helpers.reserveUsername("uid", "!!")).rejects.toThrow(
          "Usernames must be 3-30 characters"
        );
      });

      it("reserves username successfully", async () => {
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            const mockTransaction = {
              get: jest.fn().mockResolvedValue({ exists: () => false }),
              set: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        const result = await helpers.reserveUsername("uid", "valid-user");
        expect(result).toBe("valid-user");
        expect(runTransaction).toHaveBeenCalled();
      });

      it("throws error if username taken", async () => {
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            const mockTransaction = {
              get: jest.fn().mockResolvedValue({ exists: () => true }),
              set: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        await expect(
          helpers.reserveUsername("uid", "taken-user")
        ).rejects.toThrow("This username is already taken");
      });
    });

    describe("allocateUsernameForUser", () => {
      it("allocates base username if available", async () => {
        // Mock reserveUsername success on first try
        // Since reserveUsername is internal, we have to mock runTransaction to succeed
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            const mockTransaction = {
              get: jest.fn().mockResolvedValue({ exists: () => false }),
              set: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        await helpers.allocateUsernameForUser("uid", "baseuser");
        expect(runTransaction).toHaveBeenCalledTimes(1);
      });

      it("retries with suffix if taken", async () => {
        let callCount = 0;
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            callCount++;
            const mockTransaction = {
              get: jest
                .fn()
                .mockResolvedValue({ exists: () => callCount === 1 }), // First call exists (taken), second call doesn't
              set: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        await helpers.allocateUsernameForUser("uid", "baseuser");
        expect(runTransaction).toHaveBeenCalledTimes(2);
      });
    });

    describe("ensureUserProfile", () => {
      it("creates profile if not exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
          exists: () => false,
          data: () => ({}),
        });
        // Mock allocateUsernameForUser success (via runTransaction)
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            const mockTransaction = {
              get: jest.fn().mockResolvedValue({ exists: () => false }),
              set: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        const user = {
          uid: "uid",
          email: "test@test.com",
          displayName: "Test User",
          photoURL: "url",
          providerData: [],
          emailVerified: true,
        } as unknown as User;

        await helpers.ensureUserProfile(user);

        expect(setDoc).toHaveBeenCalled();
        expect(runTransaction).toHaveBeenCalled(); // for allocateUsername
      });

      it("does nothing if profile exists with username", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
          exists: () => true,
          data: () => ({ username: "existing" }),
        });

        const user = { uid: "uid" } as User;
        await helpers.ensureUserProfile(user);

        expect(setDoc).not.toHaveBeenCalled();
        expect(runTransaction).not.toHaveBeenCalled();
      });
    });

    describe("releaseUsernameReservation", () => {
      it("deletes username and profile", async () => {
        (runTransaction as jest.Mock).mockImplementation(
          async (db, callback) => {
            const mockTransaction = {
              get: jest
                .fn()
                .mockResolvedValue({
                  exists: () => true,
                  data: () => ({ uid: "uid" }),
                }),
              delete: jest.fn(),
            };
            await callback(mockTransaction);
          }
        );

        await helpers.releaseUsernameReservation("uid", "username");
        expect(runTransaction).toHaveBeenCalled();
      });
    });
  });
});
