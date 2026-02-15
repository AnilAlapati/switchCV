"use client";

import React from "react";
import { AuthFormInputs } from "./AuthFormInputs";
import type { UsernameStatus } from "@/hooks/useAuthPage.types";

interface SignupFormProps {
  email: string;
  password: string;
  username: string;
  error: string;
  usernameError: string;
  usernameStatus: UsernameStatus;
  isCheckingUsername: boolean;
  usernameSuggestion: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onUsernameChange: (username: string) => void;
  onUseSuggestion: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  email,
  password,
  username,
  error,
  usernameError,
  usernameStatus,
  isCheckingUsername,
  usernameSuggestion,
  loading,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onUseSuggestion,
  onSubmit,
  onSwitchToLogin,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AuthFormInputs
        email={email}
        password={password}
        username={username}
        showUsername={true}
        usernameError={usernameError}
        usernameStatus={usernameStatus}
        isCheckingUsername={isCheckingUsername}
        usernameSuggestion={usernameSuggestion}
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onUsernameChange={onUsernameChange}
        onUseSuggestion={onUseSuggestion}
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
          <p className="text-rose-600 text-sm text-center" role="alert">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 glass-button font-bold rounded-xl"
      >
        {loading ? (
          <div className="flex items-center justify-center" aria-live="polite">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" role="status"></div>
            Processing...
          </div>
        ) : (
          "Create Account"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#2C4A3B]/60 hover:text-[#1A2F25] text-sm font-medium transition-colors duration-200"
        >
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
};
