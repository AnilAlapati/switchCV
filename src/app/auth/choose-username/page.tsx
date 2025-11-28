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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Redirecting to sign in...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
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
          <h1 className="text-2xl font-bold text-gray-900">
            Choose your username
          </h1>
          <p className="mt-2 text-gray-600">
            This will be your unique identifier on SwitchCV
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6">
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status !== "available" || isSubmitting || isPending}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Setting username..." : "Continue"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip for now
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">
            We&apos;ll assign you{" "}
            <span className="font-mono text-gray-600">
              @{skipPreviewUsername}
            </span>
          </p>
        </div>

        {user.email && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
