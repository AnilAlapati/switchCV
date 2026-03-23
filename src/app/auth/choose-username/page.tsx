"use client";

/**
 * Choose Username Page - Google OAuth users select their username.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  const { profile, loading: profileLoading } = useUserProfile();

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
    if (!loading && !profileLoading && user) {
      if (
        profile?.approvalStatus === "pending" ||
        profile?.approvalStatus === "declined"
      ) {
        router.replace("/auth");
        return;
      }

      checkNeedsUsername().then((needs) => {
        if (!needs) router.replace("/dashboard");
      });
    }
  }, [
    loading,
    profile?.approvalStatus,
    profileLoading,
    user,
    checkNeedsUsername,
    router,
  ]);

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

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF8]">
        <div data-testid="loading-spinner" className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF8]">
        <p className="text-gray-500 font-serif italic">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex p-4 justify-center items-center bg-[#FFFFF8]">
      {/* Subtle paper texture overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%274%27 height=%274%27%3E%3Crect width=%274%27 height=%274%27 fill=%27%23f5f5dc%27/%3E%3Crect width=%271%27 height=%271%27 fill=%27%23e8e4d4%27/%3E%3C/svg%3E")' }}></div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight">SwitchCV.</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500 mt-2">The Career Agency</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-xl p-8 sm:p-12 relative overflow-hidden">
          {/* Decorative Typewriter Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-black" />

          <div className="text-left mb-8">
            <h2 className="text-2xl font-serif font-bold text-black mb-2">
              Claim Your Byline
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              Choose a unique handle for your professional profile.
            </p>
          </div>

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
              <div className="mb-4 border-l-4 border-red-600 bg-red-50 p-4">
                <p className="text-sm text-red-900 font-medium">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status !== "available" || isSubmitting || isPending}
              className="w-full py-3 px-4 bg-black text-white text-sm font-bold uppercase tracking-widest hover:bg-gray-900 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Filing..." : "Continue"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-gray-200"></span>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-bold font-mono">
              or
            </span>
            <span className="flex-1 h-px bg-gray-200"></span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Skip for now
          </button>
          <p className="mt-2 text-center text-xs text-gray-400 font-mono">
            We&apos;ll assign you{" "}
            <span className="font-medium text-gray-600">
              @{skipPreviewUsername}
            </span>
          </p>

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            {user.email && (
              <span>
                Signed in as <span className="text-gray-600">{user.email}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
