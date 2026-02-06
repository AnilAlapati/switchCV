"use client";

import Link from "next/link";
import { Suspense } from "react";
// import { AuthBrand } from "@/components/auth/AuthBrand"; // No longer used in current design
// import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs"; // No longer used
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { GoogleSignInDebug } from "@/components/auth/GoogleSignInDebug";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuthPage } from "@/hooks/useAuthPage";
import { useSystemConfig } from "@/context/SystemConfigProvider";
import { useUserProfile } from "@/hooks/useUserProfile";

function AuthContent(): React.JSX.Element {
  const {
    config: {
      auth: { registrationClosed, loginDisabled },
    },
  } = useSystemConfig();

  const { state, actions, authContext, isCheckingUsername } = useAuthPage();
  const { profile, mutate } = useUserProfile();

  const {
    isSignUp,
    email,
    password,
    username,
    error,
    loading,

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
    <div className="min-h-screen relative flex p-4 justify-center items-center bg-[#FFFFF8]">
      {/* Paper texture overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>

      {/* Back to Home Link - Absolute Positioned */}
      <Link
        href="/"
        className="absolute top-8 left-8 z-20 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors font-serif italic"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight">SwitchCV.</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500 mt-2">The Career Agency</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-xl p-8 sm:p-12 relative overflow-hidden">
          {/* Decorative Typewriter Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-black" />

          {verificationProcessing && (
            <div className="mb-6 border-l-4 border-blue-600 bg-blue-50 p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <p className="text-sm text-blue-900 font-medium font-serif italic">Verifying your credentials...</p>
              </div>
            </div>
          )}

          {verificationSuccess && !verificationProcessing && (
            <div className="mb-6 border-l-4 border-green-600 bg-green-50 p-4">
              <p className="text-sm text-green-900 font-bold font-serif">
                Success. Email verified.
              </p>
              <p className="text-xs text-green-800 mt-1 font-mono">
                Proceed to login.
              </p>
            </div>
          )}

          {needsEmailVerification && !isSignUp && !verificationSuccess && (
            <EmailVerificationNotice
              email={verificationEmail}
              approvalStatus={profile?.approvalStatus}
              onResend={handleResend}
              onRefresh={async () => {
                await handleRefreshVerification();
                await mutate();
              }}
              onSignOut={actions.logout}
              resending={resending}
              refreshing={refreshing}
            />
          )}

          <div className="text-left mb-8">
            <h2 className="text-2xl font-serif font-bold text-black mb-2">
              {isSignUp ? "Begin Application" : "Access Terminal"}
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              {isSignUp
                ? registrationClosed
                  ? "New entries are currently paused."
                  : "Start your professional narrative."
                : loginDisabled
                  ? "Terminal access disabled."
                  : "Enter your credentials to continue."}
            </p>
          </div>

          {((!isSignUp && !loginDisabled) ||
            (isSignUp && !registrationClosed)) && (
              <div className="mb-8">
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                />

                <div className="flex items-center gap-3 mt-6">
                  <span className="flex-1 h-px bg-gray-200"></span>
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-bold font-mono">
                    or
                  </span>
                  <span className="flex-1 h-px bg-gray-200"></span>
                </div>
              </div>
            )}

          {isSignUp && registrationClosed ? (
            <MaintenanceNotice
              message="System upgrades in progress. Registration paused."
              actionLabel="Return to Sign In"
              onAction={() => setIsSignUp(false)}
            />
          ) : !isSignUp && loginDisabled ? (
            <MaintenanceNotice
              message="System upgrades in progress. Login paused."
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

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            <span>Vol. 2025</span>
            <div className="space-x-4">
              <a href="#" className="hover:text-black transition-colors">Terms</a>
              <a href="#" className="hover:text-black transition-colors">Privacy</a>
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
}: MaintenanceNoticeProps): React.JSX.Element {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
      <p className="text-amber-800 mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function AuthPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthContent />
      {process.env.NODE_ENV !== "production" && <GoogleSignInDebug />}
    </Suspense>
  );
}
