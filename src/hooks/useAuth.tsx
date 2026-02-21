/* eslint-disable max-lines */
// src/hooks/useAuth.tsx
"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
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
import { logger } from "@/lib/logger";

const googleProvider =
  typeof window !== "undefined" ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

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
    null,
  );
  const [connectivityIssue, setConnectivityIssue] = useState<string | null>(
    null,
  );

  const { firebase: firebaseConnectivity } = useConnectivityStatus();
  const firebaseReady = Boolean(firebaseConnectivity?.isReady);

  const { reserveUsername, ensureUserProfile, releaseUsernameReservation } =
    useMemo(() => createAuthProfileHelpers(db), []);

  const skipEmailVerification =
    process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === "true";

  const needsEmailVerification =
    !!user &&
    isPasswordProvider(user) &&
    !user.emailVerified &&
    !skipEmailVerification;

  const ensureAuthAvailable = useCallback(() => {
    if (!firebaseReady) {
      throw new Error(
        connectivityIssue ||
        "Authentication service is temporarily unavailable. Please try again later.",
      );
    }
  }, [firebaseReady, connectivityIssue]);

  useEffect(() => {
    if (!firebaseReady) {
      setConnectivityIssue(
        firebaseConnectivity?.error ||
        "Firebase configuration is incomplete. Please contact support.",
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

  const sendVerification = useCallback(
    async (targetUser?: User | null) => {
      ensureAuthAvailable();
      const activeUser = targetUser || auth.currentUser;
      if (!activeUser) {
        throw new Error("No signed-in user to verify.");
      }

      // Use Cloud Function to send branded email via custom SMTP
      try {
        const resendVerificationEmailFn = httpsCallable(
          functions,
          "resendVerificationEmail",
        );
        await resendVerificationEmailFn();
        setVerificationEmail(activeUser.email ?? null);
      } catch (error) {
        // Silently fail - verification resend error is non-critical
        throw error;
      }
    },
    [ensureAuthAvailable],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      ensureAuthAvailable();
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
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
    },
    [ensureUserProfile, ensureAuthAvailable],
  );

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      ensureAuthAvailable();
      let credential: { user: User } | null = null;
      let reservedUsername: string | null = null;
      try {
        const normalized = sanitizeUsername(username);
        if (!normalized || !USERNAME_REGEX.test(normalized)) {
          throw new Error(
            "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores.",
          );
        }

        credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
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
          },
        );

        // Username successfully reserved - mark that we don't need username selection
        // This prevents race condition where checkNeedsUsername() is called before Firestore write propagates
        setNeedsUsername(false);

        setNeedsUsername(false);

        // We rely on the 'onUserCreated' Cloud Function to send the welcome/verification email
        // This ensures we use our custom SMTP and branded template instead of Firebase's default
        // If the cloud function fails, the user can use the "Resend" button in the dashboard
      } catch (error) {
        // Only rollback if the error is NOT a permission error that might resolve
        // (permission errors are now retried in reserveUsername with backoff)
        const firestoreError = error as { code?: string; message?: string };
        const errorMessage =
          error instanceof Error ? error.message.toLowerCase() : "";
        const isPermissionError =
          firestoreError.code === "permission-denied" ||
          errorMessage.includes("missing or insufficient permissions") ||
          errorMessage.includes("permission denied");

        // If it's a permission error after all retries, the user exists but profile doesn't
        // Don't delete the user - they can try to complete signup later or use password reset
        if (!isPermissionError && credential?.user) {
          if (reservedUsername) {
            try {
              await releaseUsernameReservation(
                credential.user.uid,
                reservedUsername,
              );
            } catch (releaseError) {
              reportError(releaseError, {
                source: "useAuth.signUp.rollback",
                severity: "warning",
              });
            }
          }

          try {
            await credential.user.delete();
          } catch (deleteError) {
            reportError(deleteError, {
              source: "useAuth.signUp.rollback",
              severity: "warning",
            });
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
    },
    [
      ensureAuthAvailable,
      reserveUsername,
      releaseUsernameReservation,
    ],
  );

  const logout = useCallback(async () => {
    ensureAuthAvailable();

    // Clear all user-specific localStorage data
    if (user?.uid) {
      const SESSION_KEY = `resume_creation_session_${user.uid}`;
      localStorage.removeItem(SESSION_KEY);
      logger.info({ userId: user.uid }, "Cleared resume session on logout");
    }

    await signOut(auth);
  }, [user?.uid, ensureAuthAvailable]);

  const signInWithGoogle = useCallback(async (): Promise<{
    needsUsername: boolean;
  }> => {
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
      // Don't report popup-closed — it's user-initiated, not an app error
      if (authError.code !== "auth/popup-closed-by-user") {
        reportError(error, {
          source: "useAuth.googleSignIn",
          severity: "warning",
          meta: { code: authError.code },
        });
      }
      throw new Error(getGoogleSignInErrorMessage(authError));
    }
  }, [ensureUserProfile, ensureAuthAvailable]);

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
          "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores.",
        );
      }

      // Use ensureUserProfile with the username option to complete the flow
      await ensureUserProfile(user, { username: normalized });
      setNeedsUsername(false);
    },
    [user, ensureUserProfile],
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

  const resendVerificationEmail = useCallback(async () => {
    await sendVerification();
  }, [sendVerification]);

  const refreshUser = useCallback(async () => {
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
  }, []);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
