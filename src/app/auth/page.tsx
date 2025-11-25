"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthFormInputs } from "@/components/auth/AuthFormInputs";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { REGISTRATION_DISABLED, LOGIN_DISABLED } from "@/lib/config";

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

  const {
    user,
    loading: authLoading,
    needsEmailVerification,
    verificationEmail,
    signIn,
    signUp,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUser,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("mode") === "signup") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user && !needsEmailVerification) {
      router.push("/dashboard");
    }
  }, [user, needsEmailVerification, authLoading, router]);

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
        await signUp(email, password, username);
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
      await signInWithGoogle();
      router.push("/dashboard");
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
            {needsEmailVerification && (
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
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onUsernameChange={setUsername}
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

            {!isSignUp && !LOGIN_DISABLED && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-white/20"></span>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    or
                  </span>
                  <span className="flex-1 h-px bg-white/20"></span>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-white/20 rounded-xl text-white/90 hover:bg-white/10 transition disabled:opacity-50"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21.6 12.2273C21.6 11.5182 21.5364 10.8364 21.4182 10.1818H12V14.05H17.4182C17.1864 15.3 16.5 16.3545 15.4455 17.0409V19.5455H18.3818C20.3273 17.7636 21.6 15.2727 21.6 12.2273Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 22C14.7 22 16.9636 21.1045 18.3818 19.5455L15.4455 17.0409C14.6818 17.5509 13.7182 17.8636 12 17.8636C9.38182 17.8636 7.17273 16.0727 6.38182 13.7273H3.32727V16.3091C4.73636 19.5909 8.09091 22 12 22Z"
                      fill="#34A853"
                    />
                    <path
                      d="M6.38182 13.7273C6.18182 13.2182 6.07273 12.6682 6.07273 12.0909C6.07273 11.5136 6.18182 10.9636 6.38182 10.4545V7.87273H3.32727C2.74545 9.09091 2.4 10.5 2.4 12.0909C2.4 13.6818 2.74545 15.0909 3.32727 16.3091L6.38182 13.7273Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 6.31818C13.8545 6.31818 15.2727 7.15455 16.0636 7.87273L18.4455 5.49091C16.9545 4.10909 14.7 3 12 3C8.09091 3 4.73636 5.40909 3.32727 8.69091L6.38182 11.2727C7.17273 8.92727 9.38182 6.31818 12 6.31818Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>
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
