// src/hooks/useAuth.tsx
"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
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
import { serverTimestamp } from "firebase/firestore";
import {
  createAuthProfileHelpers,
  isPasswordProvider,
  sanitizeUsername,
  USERNAME_REGEX,
  type UsernameReservationError,
} from "./useAuth.helpers";
import { useConnectivityStatus } from "@/context/ConnectivityStatusProvider";
import { getSanitizedMessage, reportError } from "@/lib/errorReporter";

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
  verificationEmail: string | null;
  connectivityIssue: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
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
      throw new Error(
        authError.code === "auth/invalid-credential"
          ? "Invalid email or password. Please check your credentials or sign up first."
          : authError.code === "auth/user-not-found"
          ? "No account found with this email. Please sign up first."
          : authError.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : authError.code === "auth/too-many-requests"
          ? "Too many failed login attempts. Please try again later."
          : getSanitizedMessage(authError, "Failed to sign in")
      );
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
      if (credential?.user) {
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
      throw new Error(
        authError.code === "auth/email-already-in-use"
          ? "This email is already registered. Please sign in instead."
          : authError.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : authError.code === "auth/invalid-email"
          ? "Invalid email address."
          : (authError as UsernameReservationError).code === "username-taken"
          ? "This username is already taken. Please choose another."
          : getSanitizedMessage(authError, "Failed to create account")
      );
    }
  };

  const logout = async () => {
    ensureAuthAvailable();
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    ensureAuthAvailable();
    if (!googleProvider) {
      throw new Error("Google Sign-In is not available in this environment.");
    }

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setVerificationEmail(credential.user.email ?? null);
      await ensureUserProfile(credential.user);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      reportError(error, {
        source: "useAuth.googleSignIn",
        severity: "warning",
        meta: { code: authError.code },
      });
      throw new Error(
        authError.code === "auth/popup-closed-by-user"
          ? "Google sign-in was closed before completion."
          : getSanitizedMessage(authError, "Failed to sign in with Google")
      );
    }
  };

  const resendVerificationEmail = async () => {
    await sendVerification();
  };

  const refreshUser = async () => {
    if (!auth?.currentUser) {
      return;
    }
    try {
      await auth.currentUser.reload();
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
    verificationEmail,
    connectivityIssue,
    signIn,
    signUp,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
