// src/hooks/useAuth.tsx
/* eslint-disable max-lines */
"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
  useCallback,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  createAuthProfileHelpers,
  isPasswordProvider,
  sanitizeUsername,
  USERNAME_REGEX,
} from "./useAuth.helpers";
import { useConnectivityStatus } from "@/context/ConnectivityStatusProvider";
import { reportError } from "@/lib/errorReporter";
import {
  getSignInErrorMessage,
  getSignUpErrorMessage,
  getGoogleSignInErrorMessage,
} from "./useAuth.errors";

const googleProvider =
  typeof window !== "undefined" ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

const getActionCodeSettings = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const origin = window.location.origin;
  return {
    url: `${origin}/auth?mode=verify-email`,
    handleCodeInApp: true,
  };
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsEmailVerification: boolean;
  needsUsername: boolean;
  verificationEmail: string | null;
  connectivityIssue: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ needsUsername: boolean }>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  checkNeedsUsername: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  );
  const [connectivityIssue, setConnectivityIssue] = useState<string | null>(
    null
  );

  const { firebase: firebaseConnectivity } = useConnectivityStatus();
  const firebaseReady = Boolean(firebaseConnectivity?.isReady);

  const { reserveUsername, ensureUserProfile, releaseUsernameReservation } =
    createAuthProfileHelpers(db);

  const needsEmailVerification =
    !!user && isPasswordProvider(user) && !user.emailVerified;

  const ensureAuthAvailable = () => {
    if (!firebaseReady) {
      throw new Error(
        connectivityIssue ||
          "Authentication service is temporarily unavailable. Please try again later."
      );
    }
  };

  useEffect(() => {
    if (!firebaseReady) {
      setConnectivityIssue(
        firebaseConnectivity?.error ||
          "Firebase configuration is incomplete. Please contact support."
      );
      setLoading(false);
      return;
    }

    setConnectivityIssue(null);

    try {
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setVerificationEmail(nextUser?.email ?? null);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      reportError(error, { source: "useAuth.init", severity: "error" });
      setLoading(false);
    }
  }, [firebaseReady, firebaseConnectivity?.error]);

  const sendVerification = async (targetUser?: User | null) => {
    ensureAuthAvailable();
    const activeUser = targetUser || auth.currentUser;
    if (!activeUser) {
      throw new Error("No signed-in user to verify.");
    }
    await sendEmailVerification(activeUser, getActionCodeSettings());
    setVerificationEmail(activeUser.email ?? null);
  };

  const signIn = async (email: string, password: string) => {
    ensureAuthAvailable();
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setVerificationEmail(credential.user.email ?? null);
      await ensureUserProfile(credential.user);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      reportError(error, {
        source: "useAuth.signIn",
        severity: "warning",
        meta: { code: authError.code },
      });
      throw new Error(getSignInErrorMessage(authError));
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    ensureAuthAvailable();
    let credential: { user: User } | null = null;
    let reservedUsername: string | null = null;
    try {
      const normalized = sanitizeUsername(username);
      if (!normalized || !USERNAME_REGEX.test(normalized)) {
        throw new Error(
          "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores."
        );
      }

      credential = await createUserWithEmailAndPassword(auth, email, password);
      setVerificationEmail(credential.user.email ?? email);

      // Wait for the auth token to be ready before writing to Firestore
      // This prevents "Missing or insufficient permissions" errors
      await credential.user.getIdToken(true);

      reservedUsername = await reserveUsername(
        credential.user.uid,
        normalized,
        {
          email,
          displayName: normalized,
          authProvider: "password",
          createdAt: serverTimestamp(),
        }
      );

      if (!credential.user.emailVerified) {
        await sendVerification(credential.user);
      }
    } catch (error) {
      // Only rollback if the error is NOT a permission error that might resolve
      // (permission errors are now retried in reserveUsername with backoff)
      const firestoreError = error as { code?: string; message?: string };
      const isPermissionError =
        firestoreError.code === "permission-denied" ||
        (error instanceof Error &&
          error.message.includes("Missing or insufficient permissions"));

      // If it's a permission error after all retries, the user exists but profile doesn't
      // Don't delete the user - they can try to complete signup later or use password reset
      if (!isPermissionError && credential?.user) {
        try {
          await credential.user.delete();
        } catch (deleteError) {
          reportError(deleteError, {
            source: "useAuth.signUp.rollback",
            severity: "warning",
          });
        }

        if (reservedUsername) {
          await releaseUsernameReservation(
            credential.user.uid,
            reservedUsername
          );
        }
      }

      const authError = error as { code?: string; message?: string };
      reportError(error, {
        source: "useAuth.signUp",
        severity: "warning",
        meta: { code: authError.code },
      });
      throw new Error(getSignUpErrorMessage(authError));
    }
  };

  const logout = async () => {
    ensureAuthAvailable();
    await signOut(auth);
  };

  const signInWithGoogle = async (): Promise<{ needsUsername: boolean }> => {
    ensureAuthAvailable();
    if (!googleProvider) {
      throw new Error("Google Sign-In is not available in this environment.");
    }

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setVerificationEmail(credential.user.email ?? null);
      const result = await ensureUserProfile(credential.user);
      setNeedsUsername(result.needsUsername);
      return { needsUsername: result.needsUsername };
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      reportError(error, {
        source: "useAuth.googleSignIn",
        severity: "warning",
        meta: { code: authError.code },
      });
      throw new Error(getGoogleSignInErrorMessage(authError));
    }
  };

  /**
   * Set username for a user who signed in via Google OAuth.
   * This completes the username selection process.
   */
  const setUsername = useCallback(
    async (username: string): Promise<void> => {
      if (!user) {
        throw new Error("No user is signed in.");
      }

      const normalized = sanitizeUsername(username);
      if (!normalized || !USERNAME_REGEX.test(normalized)) {
        throw new Error(
          "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores."
        );
      }

      // Use ensureUserProfile with the username option to complete the flow
      await ensureUserProfile(user, { username: normalized });
      setNeedsUsername(false);
    },
    [user, ensureUserProfile]
  );

  /**
   * Check if the current user needs to set a username.
   * Called on app load to handle users who abandoned the username selection flow.
   */
  const checkNeedsUsername = useCallback(async (): Promise<boolean> => {
    if (!user || !db) {
      return false;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.data();
      const needs = data?.needsUsername === true || !data?.username;
      setNeedsUsername(needs);
      return needs;
    } catch (error) {
      reportError(error, {
        source: "useAuth.checkNeedsUsername",
        severity: "warning",
      });
      return false;
    }
  }, [user]);

  const resendVerificationEmail = async () => {
    await sendVerification();
  };

  const refreshUser = async () => {
    if (!auth?.currentUser) {
      return;
    }
    try {
      // Reload user data from Firebase Auth server
      await auth.currentUser.reload();
      // Force refresh the ID token to get updated emailVerified status
      await auth.currentUser.getIdToken(true);
      setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
      setVerificationEmail(auth.currentUser?.email ?? null);
    } catch (error) {
      reportError(error, {
        source: "useAuth.refreshUser",
        severity: "warning",
      });
    }
  };

  const value = {
    user,
    loading,
    needsEmailVerification,
    needsUsername,
    verificationEmail,
    connectivityIssue,
    signIn,
    signUp,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUser,
    logout,
    setUsername,
    checkNeedsUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
