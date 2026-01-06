"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { USERNAME_CONFIG } from "@/config/constants";
import { useUsernameChecker } from "./useAuthPage.helpers";
import type { UsernameStatus, UseAuthPageReturn } from "./useAuthPage.types";

export type {
  UsernameStatus,
  AuthPageState,
  AuthPageActions,
  UseAuthPageReturn,
} from "./useAuthPage.types";

export function useAuthPage(): UseAuthPageReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verificationAttempted = useRef(false);

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationProcessing, setVerificationProcessing] = useState(false);

  // Debounce username for availability check
  const { debouncedValue: debouncedUsername, isPending: isCheckingUsername } =
    useDebouncedValue(username, USERNAME_CONFIG.CHECK_DEBOUNCE_MS);

  // Auth context
  const {
    user,
    loading: authLoading,
    needsEmailVerification,
    needsUsername,
    verificationEmail,
    signIn,
    signUp,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUser,
    checkNeedsUsername,
  } = useAuth();

  // Username availability checker
  const { checkUsernameAvailability } = useUsernameChecker(debouncedUsername, {
    setUsernameStatus,
    setUsernameError,
    setUsernameSuggestion,
  });

  // Effects
  useEffect(() => {
    if (isSignUp && debouncedUsername) {
      checkUsernameAvailability();
    }
  }, [isSignUp, debouncedUsername, checkUsernameAvailability]);

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("mode") === "signup") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  // Handle email verification link and custom verification success
  useEffect(() => {
    const handleEmailVerification = async () => {
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");
      const isCustomSuccess =
        searchParams.get("verificationSuccess") === "true";

      if (isCustomSuccess && !verificationAttempted.current) {
        verificationAttempted.current = true;
        setVerificationSuccess(true);
        // Refresh user to update UI state
        await refreshUser();
        return;
      }

      if (
        (mode === "verifyEmail" || mode === "verify-email") &&
        oobCode &&
        auth &&
        !verificationAttempted.current
      ) {
        verificationAttempted.current = true;
        setVerificationProcessing(true);
        setError("");

        try {
          await applyActionCode(auth, oobCode);

          if (auth.currentUser) {
            await auth.currentUser.reload();
            await auth.currentUser.getIdToken(true);
          }

          setVerificationSuccess(true);
          setError("");
          await refreshUser();
        } catch (err) {
          const firebaseError = err as { code?: string; message?: string };
          if (firebaseError.code === "auth/expired-action-code") {
            setError(
              "This verification link has expired. Please request a new one."
            );
          } else if (firebaseError.code === "auth/invalid-action-code") {
            setError(
              "This verification link is invalid or has already been used."
            );
          } else {
            setError(
              firebaseError.message ||
              "Failed to verify email. Please try again."
            );
          }
        } finally {
          setVerificationProcessing(false);
        }
      }
    };

    handleEmailVerification();
  }, [searchParams, refreshUser]);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user && !needsEmailVerification) {
      const target = needsUsername ? "/auth/choose-username" : "/dashboard";

      // If we just verified the email, show the success message for 2.5 seconds
      if (verificationSuccess) {
        const timer = setTimeout(() => {
          router.push(target);
        }, 2500);
        return () => clearTimeout(timer);
      } else {
        router.push(target);
      }
    }
  }, [
    user,
    needsEmailVerification,
    needsUsername,
    authLoading,
    router,
    checkNeedsUsername,
    verificationSuccess,
  ]);

  // Action handlers
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      setUsernameError("");

      try {
        if (isSignUp) {
          if (!username.trim()) {
            setUsernameError("Username is required to create your profile.");
            return setLoading(false);
          }
          if (isCheckingUsername || usernameStatus === "checking") {
            setUsernameError(
              "Please wait for username availability check to complete."
            );
            return setLoading(false);
          }
          if (usernameStatus !== "available" && usernameStatus !== "idle") {
            setUsernameError("Please choose an available username.");
            return setLoading(false);
          }
          await signUp(email, password, username);
          setIsSignUp(false);
        } else {
          await signIn(email, password);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setError(message);
        if (message.toLowerCase().includes("username")) {
          setUsernameError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      isSignUp,
      username,
      isCheckingUsername,
      usernameStatus,
      email,
      password,
      signUp,
      signIn,
    ]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      router.push(
        result.needsUsername ? "/auth/choose-username" : "/dashboard"
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google"
      );
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, router]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setError("");
    try {
      await resendVerificationEmail();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email"
      );
    } finally {
      setResending(false);
    }
  }, [resendVerificationEmail]);

  const handleRefreshVerification = useCallback(async () => {
    setRefreshing(true);
    setError(""); // Clear previous errors
    try {
      await refreshUser();

      // Check if verification status changed
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        setError(
          "Email is not verified yet. Please check your inbox and try again."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh status");
    } finally {
      // Small delay to prevent button flickering/spamming
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [refreshUser]);

  const handleUseSuggestion = useCallback(() => {
    setUsername(usernameSuggestion);
  }, [usernameSuggestion]);

  const { logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Silently fail - logout error is non-critical
    }
  }, [logout]);

  return {
    state: {
      isSignUp,
      email,
      password,
      username,
      error,
      loading,
      mounted,
      usernameError,
      resending,
      refreshing,
      usernameStatus,
      usernameSuggestion,
      verificationSuccess,
      verificationProcessing,
    },
    actions: {
      setIsSignUp,
      setEmail,
      setPassword,
      setUsername,
      setError,
      handleSubmit,
      handleGoogleSignIn,
      handleResend,
      handleRefreshVerification,
      handleUseSuggestion,
      logout: handleLogout,
    },
    authContext: { needsEmailVerification, verificationEmail },
    isCheckingUsername,
  };
}
