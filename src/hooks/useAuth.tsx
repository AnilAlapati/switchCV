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
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  createAuthProfileHelpers,
  isPasswordProvider,
} from "./useAuth.helpers";
import { useConnectivityStatus } from "@/context/ConnectivityStatusProvider";
import { reportError } from "@/lib/errorReporter";
import { useAuthActions } from "./useAuthActions";

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

  const helpers = useMemo(() => createAuthProfileHelpers(db), []);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const refreshUser = useCallback(async () => {
    if (!auth?.currentUser) {
      return;
    }
    try {
      await auth.currentUser.reload();
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

  const {
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    setUsername,
    checkNeedsUsername,
    resendVerificationEmail,
  } = useAuthActions({
    ensureAuthAvailable,
    setNeedsUsername,
    setVerificationEmail,
    helpers,
    user,
  });

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
