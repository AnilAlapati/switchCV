import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export interface UsernameReservationError extends Error {
  code?: "username-taken";
}

export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;

export const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-{2,}/g, "-");

export const isPasswordProvider = (firebaseUser: User | null) =>
  !!firebaseUser?.providerData.some(
    (provider) => provider.providerId === "password"
  );

export function createAuthProfileHelpers(db: Firestore | null | undefined) {
  const firestoreUnavailable = !db || (db as { __isMock?: boolean }).__isMock;

  const reserveUsername = async (
    uid: string,
    username: string,
    profileData?: Record<string, unknown>
  ) => {
    const normalized = sanitizeUsername(username);
    if (!normalized || !USERNAME_REGEX.test(normalized)) {
      throw new Error(
        "Usernames must be 3-30 characters and can include lowercase letters, numbers, hyphens, and underscores."
      );
    }

    if (firestoreUnavailable || !db) {
      return normalized;
    }

    const usernameRef = doc(db, "usernames", normalized);
    const profileRef = doc(db, "users", uid);

    await runTransaction(db, async (transaction) => {
      const usernameSnapshot = await transaction.get(usernameRef);
      if (usernameSnapshot.exists()) {
        const err: UsernameReservationError = new Error(
          "This username is already taken."
        );
        err.code = "username-taken";
        throw err;
      }

      transaction.set(usernameRef, {
        uid,
        createdAt: serverTimestamp(),
      });

      transaction.set(
        profileRef,
        {
          username: normalized,
          emailVerified: false,
          updatedAt: serverTimestamp(),
          ...profileData,
        },
        { merge: true }
      );
    });

    return normalized;
  };

  const allocateUsernameForUser = async (uid: string, base: string) => {
    if (firestoreUnavailable) {
      return;
    }

    const attempts = 5;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const suffix =
        attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
      const candidate = sanitizeUsername(`${base}${suffix}`);
      if (!candidate) {
        continue;
      }
      try {
        await reserveUsername(uid, candidate);
        return;
      } catch (error) {
        lastError = error;
        if ((error as UsernameReservationError).code !== "username-taken") {
          throw error;
        }
      }
    }
    throw lastError || new Error("Unable to assign username.");
  };

  const ensureUserProfile = async (
    firebaseUser: User,
    options?: { username?: string; autoGenerate?: boolean }
  ) => {
    if (firestoreUnavailable || !db) {
      return;
    }

    const profileRef = doc(db, "users", firebaseUser.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      await setDoc(
        profileRef,
        {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          authProvider: firebaseUser.providerData[0]?.providerId || "password",
          emailVerified: firebaseUser.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const existingData = profileSnapshot.data() || {};
    if (!existingData.username) {
      const targetUsername =
        options?.username ||
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "switcher";
      await allocateUsernameForUser(firebaseUser.uid, targetUsername);
    }
  };

  const releaseUsernameReservation = async (
    uid: string,
    username?: string
  ): Promise<void> => {
    if (firestoreUnavailable || !db || !username) {
      return;
    }

    const normalized = sanitizeUsername(username);
    const usernameRef = doc(db, "usernames", normalized);
    const profileRef = doc(db, "users", uid);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(usernameRef);
      if (snap.exists() && snap.data()?.uid === uid) {
        transaction.delete(usernameRef);
      }
      transaction.delete(profileRef);
    });
  };

  return {
    firestoreUnavailable,
    reserveUsername,
    ensureUserProfile,
    allocateUsernameForUser,
    releaseUsernameReservation,
  };
}
