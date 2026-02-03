import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentReference,
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

const PROPAGATION_TIMEOUT_MS = 3000; // Reduced from 7s to 3s
const PROPAGATION_POLL_INTERVAL_MS = 150; // Reduced from 250ms to 150ms for faster checks
const RETRY_BASE_DELAY_MS = 200; // Reduced from 300ms to 200ms

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isPermissionError = (error: { code?: string; message?: string }) => {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase?.() ?? "";
  return (
    error.code === "permission-denied" ||
    message.includes("missing or insufficient permissions") ||
    message.includes("permission denied")
  );
};

export const isPasswordProvider = (firebaseUser: User | null) =>
  !!firebaseUser?.providerData.some(
    (provider) => provider.providerId === "password",
  );

export function createAuthProfileHelpers(db: Firestore | null | undefined) {
  const firestoreUnavailable = !db || (db as { __isMock?: boolean }).__isMock;

  const waitForAuthPropagation = async (
    profileRef: DocumentReference,
  ): Promise<void> => {
    if (firestoreUnavailable || !db) {
      return;
    }

    const deadline = Date.now() + PROPAGATION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        await getDoc(profileRef);
        return;
      } catch (error) {
        if (!isPermissionError(error as { code?: string; message?: string })) {
          throw error;
        }
        await delay(PROPAGATION_POLL_INTERVAL_MS);
      }
    }

    throw new Error(
      "We're finalizing your account setup. Please try again in a few seconds.",
    );
  };

  const reserveUsername = async (
    uid: string,
    username: string,
    profileData?: Record<string, unknown>,
  ) => {
    const normalized = sanitizeUsername(username);
    if (!normalized || !USERNAME_REGEX.test(normalized)) {
      throw new Error(
        "Usernames must be 3-30 characters and can include lowercase letters, numbers, hyphens, and underscores.",
      );
    }

    if (firestoreUnavailable || !db) {
      return normalized;
    }

    const usernameRef = doc(db, "usernames", normalized);
    const profileRef = doc(db, "users", uid);
    const identitySafeProfile = {
      ...profileData,
      email: typeof profileData?.email === "string" ? profileData.email : "",
      uid,
    };

    // Retry logic with exponential backoff to handle Firebase Auth-to-Firestore
    // propagation delay. After creating a user, there can be a 0-2 second delay
    // before Firestore security rules can validate the auth token.
    const maxRetries = 3; // Reduced from 5 to 3 for faster failure

    // Only wait for auth propagation if the profile doesn't exist yet
    // For existing users (e.g., Google OAuth setting username), skip this wait
    const profileSnapshot = await getDoc(profileRef);
    if (!profileSnapshot.exists()) {
      await waitForAuthPropagation(profileRef);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await runTransaction(db, async (transaction) => {
          const usernameSnapshot = await transaction.get(usernameRef);
          if (usernameSnapshot.exists()) {
            const err: UsernameReservationError = new Error(
              "This username is already taken.",
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
              ...identitySafeProfile,
            },
            { merge: true },
          );
        });

        // Success - break out of retry loop
        break;
      } catch (error) {
        const firestoreError = error as { code?: string; message?: string };
        const permissionIssue = isPermissionError(firestoreError);

        if (permissionIssue && attempt < maxRetries - 1) {
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await delay(delayMs);
          continue;
        }

        // For non-permission errors or final attempt, throw
        throw error;
      }
    }

    return normalized;
  };

  const allocateUsernameForUser = async (uid: string, base: string) => {
    if (firestoreUnavailable) {
      return;
    }

    const attempts = 3; // Reduced from 5 to 3 for faster completion
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
    options?: { username?: string; autoGenerate?: boolean },
  ): Promise<{ isNewUser: boolean; needsUsername: boolean }> => {
    if (firestoreUnavailable || !db) {
      return { isNewUser: false, needsUsername: false };
    }

    // Get current token without forcing refresh - only refresh if needed
    // This significantly reduces latency for users who just signed in
    try {
      await firebaseUser.getIdToken(false); // Don't force refresh
    } catch {
      await firebaseUser.getIdToken(true); // Force refresh only on error
    }

    const profileRef = doc(db, "users", firebaseUser.uid);
    const profileSnapshot = await getDoc(profileRef);
    const isNewUser = !profileSnapshot.exists();
    const existingData = profileSnapshot.data() || {};

    // Check if user is signing in via Google (OAuth)
    const isGoogleAuth = firebaseUser.providerData.some(
      (provider) => provider.providerId === "google.com",
    );

    if (isNewUser) {
      // For Google OAuth users: create profile with needsUsername flag
      // For email/password users: username was already reserved during signup
      const profileData: Record<string, unknown> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "",
        photoURL: firebaseUser.photoURL || "",
        authProvider: firebaseUser.providerData[0]?.providerId || "password",
        emailVerified: firebaseUser.emailVerified,
        role: "jobseeker", // Default role for new users
        subscriptionTier: "basic", // Default subscription tier (legacy)
        jobSeekerTier: "basic",
        recruiterTier: "basic",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // For Google users, set needsUsername flag instead of auto-assigning
      if (isGoogleAuth && !options?.username) {
        profileData.needsUsername = true;
      }

      await setDoc(profileRef, profileData, { merge: true });

      // If username was provided (e.g., from choose-username page) or autoGenerate is true
      if (options?.username) {
        await allocateUsernameForUser(firebaseUser.uid, options.username);
        // Clear the needsUsername flag after successful username assignment
        await setDoc(
          profileRef,
          { needsUsername: false, updatedAt: serverTimestamp() },
          { merge: true },
        );
        return { isNewUser: true, needsUsername: false };
      }

      // For email/password users without explicit username, auto-generate
      if (!isGoogleAuth && options?.autoGenerate !== false) {
        const targetUsername =
          firebaseUser.displayName ||
          firebaseUser.email?.split("@")[0] ||
          "switcher";
        await allocateUsernameForUser(firebaseUser.uid, targetUsername);
        return { isNewUser: true, needsUsername: false };
      }

      // Google user needs to choose username
      return {
        isNewUser: true,
        needsUsername: isGoogleAuth && !options?.username,
      };
    }

    // Existing user - check if they still need a username
    if (existingData.needsUsername || !existingData.username) {
      // If username was provided, assign it now
      if (options?.username) {
        await allocateUsernameForUser(firebaseUser.uid, options.username);
        await setDoc(
          profileRef,
          { needsUsername: false, updatedAt: serverTimestamp() },
          { merge: true },
        );
        return { isNewUser: false, needsUsername: false };
      }
      return { isNewUser: false, needsUsername: true };
    }

    return { isNewUser: false, needsUsername: false };
  };

  const releaseUsernameReservation = async (
    uid: string,
    username?: string,
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
