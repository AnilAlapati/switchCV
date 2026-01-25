"use client";

/**
 * Choose Username Page - Google OAuth users select their username.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { USERNAME_CONFIG } from "@/config/constants";
import { UsernameInput } from "@/components/auth/UsernameInput";
import type { UsernameCheckResponse } from "@/app/api/user/username/check/route";

type AvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

export default function ChooseUsernamePage() {
  const router = useRouter();
  const { user, loading, setUsername, checkNeedsUsername } = useAuth();

  const [username, setUsernameInput] = useState("");
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [randomSuffix] = useState(() => Math.random().toString(36).slice(2, 6));

  const { debouncedValue: debouncedUsername, isPending } = useDebouncedValue(
    username,
    USERNAME_CONFIG.CHECK_DEBOUNCE_MS
  );

  const skipPreviewUsername = (() => {
    const base = user?.displayName
      ? user.displayName.toLowerCase().replace(/[^a-z0-9]/g, "")
      : user?.email
        ?.split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") ?? "switcher";
    return `${base}-${randomSuffix}`;
  })();

  useEffect(() => {
    if (!loading && user) {
      checkNeedsUsername().then((needs) => {
        if (!needs) router.replace("/dashboard");
      });
    }
  }, [loading, user, checkNeedsUsername, router]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (
        !debouncedUsername ||
        debouncedUsername.length < USERNAME_CONFIG.MIN_LENGTH
      ) {
        setStatus("idle");
        setMessage("");
        setSuggestion("");
        return;
      }

      setStatus("checking");
      setMessage("");

      try {
        const response = await fetch(
          `/api/user/username/check?username=${encodeURIComponent(
            debouncedUsername
          )}`
        );
        const data: UsernameCheckResponse = await response.json();

        if (response.status === 429) {
          setStatus("error");
          setMessage(data.reason || "Too many requests. Please wait.");
          return;
        }

        if (data.available) {
          setStatus("available");
          setMessage("Username is available!");
          setSuggestion("");
        } else {
          setStatus(
            data.reason?.includes("format") ||
              data.reason?.includes("characters")
              ? "invalid"
              : "taken"
          );
          setMessage(data.reason || "Username is not available");
          setSuggestion(data.suggestion || "");
        }
      } catch {
        setStatus("error");
        setMessage("Failed to check availability. Please try again.");
      }
    };
    checkAvailability();
  }, [debouncedUsername]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (status !== "available" || isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError("");

      try {
        await setUsername(debouncedUsername);
        router.push("/dashboard");
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to set username. Please try again."
        );
        setIsSubmitting(false);
      }
    },
    [status, isSubmitting, debouncedUsername, setUsername, router]
  );

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await setUsername(skipPreviewUsername);
      router.push("/dashboard");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to generate username. Please try again."
      );
      setIsSubmitting(false);
    }
  }, [skipPreviewUsername, setUsername, router]);

  const handleUseSuggestion = () => {
    if (suggestion) setUsernameInput(suggestion);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Redirecting to sign in...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 text-white">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Choose your username
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            This will be your unique identifier on SwitchCV
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6">
          <form onSubmit={handleSubmit}>
            <UsernameInput
              value={username}
              onChange={setUsernameInput}
              status={status}
              isPending={isPending}
              message={message}
              suggestion={suggestion}
              disabled={isSubmitting}
              onUseSuggestion={handleUseSuggestion}
            />

            {submitError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status !== "available" || isSubmitting || isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-purple-500 focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Setting username..." : "Continue"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 focus:ring-4 focus:ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip for now
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            We&apos;ll assign you{" "}
            <span className="font-mono text-slate-400">
              @{skipPreviewUsername}
            </span>
          </p>
        </div>

        {user.email && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Signed in as{" "}
            <span className="font-medium text-slate-400">{user.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
