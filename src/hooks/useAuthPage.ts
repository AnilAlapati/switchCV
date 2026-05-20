"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { USERNAME_CONFIG } from "@/config/constants";
import {
  useEmailVerificationHandler,
  useUsernameChecker,
} from "./useAuthPage.helpers";
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

  // Resolve post-auth redirect — only allow relative paths to prevent open redirect
  const postAuthRedirect = (() => {
    const raw = searchParams.get("redirect");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
    return "/dashboard";
  })();

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
  } = useAuth();

  // Profile — needed to gate Google/OAuth users who are pending admin approval
  const { profile, loading: profileLoading } = useUserProfile();
  const isPendingApproval = profile?.approvalStatus === "pending";

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

  useEmailVerificationHandler({
    refreshUser,
    searchParams,
    verificationAttempted,
    setError,
    setVerificationProcessing,
    setVerificationSuccess,
  });

  // Redirect authenticated users
  // NOTE: !loading guard prevents this effect from firing mid-Google-sign-in.
  // When handleGoogleSignIn is awaiting ensureUserProfile(), onAuthStateChanged
  // can fire and set `user` before needsUsername is updated, causing a premature
  // redirect to /dashboard instead of /auth/choose-username. The explicit
  // router.push inside handleGoogleSignIn is the source of truth during active sign-in.
  // NOTE: Also wait for profileLoading — Google/OAuth users with approvalStatus "pending"
  // must not be redirected to /dashboard before we've confirmed their approval state.
  useEffect(() => {
    if (
      !authLoading &&
      !loading &&
      !profileLoading &&
      user &&
      !needsEmailVerification
    ) {
      if (needsUsername && !isPendingApproval) {
        // Users who still need a username can continue once approval is complete.
        const target = "/auth/choose-username";

        // If we just verified the email, show the success message for 2.5 seconds
        if (verificationSuccess) {
          const timer = setTimeout(() => {
            router.push(target);
          }, 2500);
          return () => clearTimeout(timer);
        } else {
          router.push(target);
        }
      } else if (!isPendingApproval) {
        // Only safely route to dashboard if they are NOT pending approval
        const target = postAuthRedirect;

        if (verificationSuccess) {
          const timer = setTimeout(() => {
            router.push(target);
          }, 2500);
          return () => clearTimeout(timer);
        } else {
          router.push(target);
        }
      }
    }
  }, [
    user,
    needsEmailVerification,
    isPendingApproval,
    needsUsername,
    authLoading,
    loading,
    profileLoading,
    router,
    verificationSuccess,
    postAuthRedirect,
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
              "Please wait for username availability check to complete.",
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
    ],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      // Return to /auth when username onboarding is still required so the
      // approval gate can decide whether to continue to choose-username.
      router.push(result.needsUsername ? "/auth" : postAuthRedirect);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "Google sign-in was closed before completion."
      ) {
        setError(
          "Sign-in popup closed prematurely or failed to communicate. Please ensure the domain is authorized in Firebase.",
        );
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google",
      );
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, router, postAuthRedirect]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setError("");
    try {
      await resendVerificationEmail();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email",
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
          "Email is not verified yet. Please check your inbox and try again.",
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
    authContext: {
      needsEmailVerification,
      needsUsername,
      verificationEmail,
    },
    isCheckingUsername,
  };
}
