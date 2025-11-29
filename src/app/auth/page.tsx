/* eslint-disable max-lines */
"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthFormInputs } from "@/components/auth/AuthFormInputs";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { REGISTRATION_DISABLED, LOGIN_DISABLED } from "@/lib/config";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { USERNAME_CONFIG } from "@/config/constants";
import type { UsernameCheckResponse } from "@/app/api/user/username/check/route";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

function AuthContent() {
  const searchParams = useSearchParams();

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

  // Check username availability when debounced value changes
  const checkUsernameAvailability = useCallback(async () => {
    if (
      !debouncedUsername ||
      debouncedUsername.length < USERNAME_CONFIG.MIN_LENGTH
    ) {
      setUsernameStatus("idle");
      setUsernameError("");
      setUsernameSuggestion("");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError("");

    try {
      const response = await fetch(
        `/api/user/username/check?username=${encodeURIComponent(
          debouncedUsername
        )}`
      );
      const data: UsernameCheckResponse = await response.json();

      if (response.status === 429) {
        setUsernameStatus("error");
        setUsernameError(data.reason || "Too many requests. Please wait.");
        return;
      }

      if (data.available) {
        setUsernameStatus("available");
        setUsernameError("");
        setUsernameSuggestion("");
      } else {
        const isInvalid =
          data.reason?.includes("format") ||
          data.reason?.includes("characters") ||
          data.reason?.includes("at least");
        setUsernameStatus(isInvalid ? "invalid" : "taken");
        setUsernameError(data.reason || "Username is not available");
        setUsernameSuggestion(data.suggestion || "");
      }
    } catch {
      setUsernameStatus("error");
      setUsernameError("Failed to check availability. Please try again.");
    }
  }, [debouncedUsername]);

  useEffect(() => {
    if (isSignUp && debouncedUsername) {
      checkUsernameAvailability();
    }
  }, [isSignUp, debouncedUsername, checkUsernameAvailability]);

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
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("mode") === "signup") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  // Handle email verification link (oobCode from Firebase)
  useEffect(() => {
    const handleEmailVerification = async () => {
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");

      // Check for both "verifyEmail" (Firebase default) and "verify-email" (our custom)
      if (
        (mode === "verifyEmail" || mode === "verify-email") &&
        oobCode &&
        auth
      ) {
        setVerificationProcessing(true);
        setError("");

        try {
          // Apply the action code to verify the email
          await applyActionCode(auth, oobCode);

          // Reload the current user to get updated emailVerified status
          if (auth.currentUser) {
            await auth.currentUser.reload();
            await auth.currentUser.getIdToken(true);
          }

          setVerificationSuccess(true);
          setError("");

          // Refresh the user state in our auth context
          await refreshUser();
        } catch (err) {
          const error = err as { code?: string; message?: string };
          if (error.code === "auth/expired-action-code") {
            setError(
              "This verification link has expired. Please request a new one."
            );
          } else if (error.code === "auth/invalid-action-code") {
            setError(
              "This verification link is invalid or has already been used. Please request a new one."
            );
          } else {
            setError(
              error.message || "Failed to verify email. Please try again."
            );
          }
        } finally {
          setVerificationProcessing(false);
        }
      }
    };

    handleEmailVerification();
  }, [searchParams, refreshUser]);

  useEffect(() => {
    if (!authLoading && user && !needsEmailVerification) {
      // Check if user needs to choose a username
      if (needsUsername) {
        router.push("/auth/choose-username");
      } else {
        // Also check Firestore in case state was lost
        checkNeedsUsername().then((needs) => {
          if (needs) {
            router.push("/auth/choose-username");
          } else {
            router.push("/dashboard");
          }
        });
      }
    }
  }, [
    user,
    needsEmailVerification,
    needsUsername,
    authLoading,
    router,
    checkNeedsUsername,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setUsernameError("");

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setUsernameError("Username is required to create your profile.");
          setLoading(false);
          return;
        }
        // Check if username availability check is still pending or not available
        if (isCheckingUsername || usernameStatus === "checking") {
          setUsernameError(
            "Please wait for username availability check to complete."
          );
          setLoading(false);
          return;
        }
        if (usernameStatus !== "available" && usernameStatus !== "idle") {
          setUsernameError("Please choose an available username.");
          setLoading(false);
          return;
        }
        await signUp(email, password, username);
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("username")
      ) {
        setUsernameError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      // If the user needs to choose a username (new Google OAuth user), redirect to username selection
      if (result.needsUsername) {
        router.push("/auth/choose-username");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
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
  };

  const handleRefreshVerification = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh status");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AuthBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <AuthBrand />

          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-8">
            {verificationProcessing && (
              <div className="mb-6 rounded-2xl border border-blue-400/40 bg-blue-400/10 p-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <p className="text-sm text-blue-100">
                    Verifying your email...
                  </p>
                </div>
              </div>
            )}
            {verificationSuccess && !verificationProcessing && (
              <div className="mb-6 rounded-2xl border border-green-400/40 bg-green-400/10 p-4 text-center">
                <p className="text-sm text-green-100 font-semibold">
                  ✓ Email verified successfully!
                </p>
                <p className="text-xs text-green-200/80 mt-1">
                  You can now sign in to your account.
                </p>
              </div>
            )}
            {needsEmailVerification && !isSignUp && !verificationSuccess && (
              <EmailVerificationNotice
                email={verificationEmail}
                onResend={handleResend}
                onRefresh={handleRefreshVerification}
                resending={resending}
                refreshing={refreshing}
              />
            )}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isSignUp ? "Join the Future" : "Welcome Back"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isSignUp
                  ? REGISTRATION_DISABLED
                    ? "Registration is currently closed for maintenance"
                    : "Create your account to get started"
                  : LOGIN_DISABLED
                  ? "Login is currently disabled for maintenance"
                  : "Sign in to access your dashboard"}
              </p>
            </div>

            {isSignUp && REGISTRATION_DISABLED ? (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 text-center">
                <p className="text-yellow-200 mb-4">
                  We are currently performing system upgrades. New account
                  registration is temporarily disabled.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : !isSignUp && LOGIN_DISABLED ? (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 text-center">
                <p className="text-yellow-200 mb-4">
                  We are currently performing system upgrades. Login is
                  temporarily disabled.
                </p>
                {!REGISTRATION_DISABLED && (
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Create an Account
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <AuthFormInputs
                  email={email}
                  password={password}
                  username={username}
                  showUsername={isSignUp}
                  usernameError={usernameError}
                  usernameStatus={usernameStatus}
                  isCheckingUsername={isCheckingUsername}
                  usernameSuggestion={usernameSuggestion}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onUsernameChange={setUsername}
                  onUseSuggestion={() => {
                    setUsername(usernameSuggestion);
                  }}
                />

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </div>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>

                {(!REGISTRATION_DISABLED || !LOGIN_DISABLED) && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-slate-400 hover:text-cyan-400 text-sm transition-colors duration-200"
                    >
                      {isSignUp
                        ? "Already have an account? Sign in"
                        : "Don't have an account? Sign up"}
                    </button>
                  </div>
                )}
              </form>
            )}

            {((!isSignUp && !LOGIN_DISABLED) ||
              (isSignUp && !REGISTRATION_DISABLED)) && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-white/20"></span>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    or
                  </span>
                  <span className="flex-1 h-px bg-white/20"></span>
                </div>
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                />
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
