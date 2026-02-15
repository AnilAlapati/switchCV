"use client";

import React from "react";
import { AuthFormInputs } from "./AuthFormInputs";
import type { UsernameStatus } from "@/hooks/useAuthPage.types";

interface LoginFormProps {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onSwitchToSignUp: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchToSignUp,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AuthFormInputs
        email={email}
        password={password}
        username=""
        showUsername={false}
        usernameError=""
        usernameStatus={"idle" as UsernameStatus}
        isCheckingUsername={false}
        usernameSuggestion=""
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onUsernameChange={() => { }}
        onUseSuggestion={() => { }}
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
          "Sign In"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-[#2C4A3B]/60 hover:text-[#1A2F25] text-sm font-medium transition-colors duration-200"
        >
          Don&apos;t have an account? Sign up
        </button>
      </div>
    </form>
  );
};
