"use client";

import { Suspense } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { GoogleSignInDebug } from "@/components/auth/GoogleSignInDebug";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuthPage } from "@/hooks/useAuthPage";
import { useSystemConfig } from "@/context/SystemConfigProvider";

function AuthContent() {
  const {
    config: {
      auth: { registrationClosed, loginDisabled },
    },
  } = useSystemConfig();

  const { state, actions, authContext, isCheckingUsername } = useAuthPage();

  const {
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
  } = state;

  const {
    setIsSignUp,
    setEmail,
    setPassword,
    setUsername,
    handleSubmit,
    handleGoogleSignIn,
    handleResend,
    handleRefreshVerification,
    handleUseSuggestion,
  } = actions;

  const { needsEmailVerification, verificationEmail } = authContext;

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
                  ? registrationClosed
                    ? "Registration is currently closed for maintenance"
                    : "Create your account to get started"
                  : loginDisabled
                  ? "Login is currently disabled for maintenance"
                  : "Sign in to access your dashboard"}
              </p>
            </div>

            {isSignUp && registrationClosed ? (
              <MaintenanceNotice
                message="We are currently performing system upgrades. New account registration is temporarily disabled."
                actionLabel="Return to Sign In"
                onAction={() => setIsSignUp(false)}
              />
            ) : !isSignUp && loginDisabled ? (
              <MaintenanceNotice
                message="We are currently performing system upgrades. Login is temporarily disabled."
                actionLabel={
                  !registrationClosed ? "Create an Account" : undefined
                }
                onAction={
                  !registrationClosed ? () => setIsSignUp(true) : undefined
                }
              />
            ) : isSignUp ? (
              <SignupForm
                email={email}
                password={password}
                username={username}
                error={error}
                usernameError={usernameError}
                usernameStatus={usernameStatus}
                isCheckingUsername={isCheckingUsername}
                usernameSuggestion={usernameSuggestion}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onUsernameChange={setUsername}
                onUseSuggestion={handleUseSuggestion}
                onSubmit={handleSubmit}
                onSwitchToLogin={() => setIsSignUp(false)}
              />
            ) : (
              <LoginForm
                email={email}
                password={password}
                error={error}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleSubmit}
                onSwitchToSignUp={() => setIsSignUp(true)}
              />
            )}

            {((!isSignUp && !loginDisabled) ||
              (isSignUp && !registrationClosed)) && (
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

interface MaintenanceNoticeProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function MaintenanceNotice({
  message,
  actionLabel,
  onAction,
}: MaintenanceNoticeProps) {
  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 text-center">
      <p className="text-yellow-200 mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthContent />
      <GoogleSignInDebug />
    </Suspense>
  );
}
