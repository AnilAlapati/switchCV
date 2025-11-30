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
        onUsernameChange={() => {}}
        onUseSuggestion={() => {}}
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
        ) : (
          "Sign In"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-slate-400 hover:text-cyan-400 text-sm transition-colors duration-200"
        >
          Don&apos;t have an account? Sign up
        </button>
      </div>
    </form>
  );
};
