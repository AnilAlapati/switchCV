"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";

interface RequestAccessDialogProps {
  profileName: string;
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestAccessDialog({
  profileName,
  profileId,
  isOpen,
  onClose,
  onSuccess,
}: RequestAccessDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const timezoneRef = useRef(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [durationPreset, setDurationPreset] =
    useState<DurationPreset>("1_week");
  const [customDays, setCustomDays] = useState(30);

  const durationOptions = useMemo(
    () => [
      { id: "1_hour", label: "1 Hour" },
      { id: "1_day", label: "1 Day" },
      { id: "1_week", label: "1 Week" },
      { id: "1_month", label: "1 Month" },
      { id: "custom_days", label: "Custom Days" },
    ],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to request access");
      return;
    }

    if (!profileId.trim()) {
      setError("Invalid profile ID");
      return;
    }

    if (durationPreset === "custom_days") {
      if (!customDays || customDays < 1) {
        setDurationError("Custom duration must be at least 1 day");
        return;
      }
      if (customDays > MAX_CUSTOM_DAYS) {
        setDurationError(
          `Custom duration cannot exceed ${MAX_CUSTOM_DAYS} days`
        );
        return;
      }
    }

    setDurationError(null);

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch("/api/profiles/request-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId: profileId,
          message: message.trim() || undefined,
          duration: {
            preset: durationPreset,
            ...(durationPreset === "custom_days"
              ? { customDays: customDays }
              : {}),
          },
          timezone: timezoneRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to send request"
        );
      }

      setMessage("");
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Request error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-slate-900/95 to-slate-950/95 p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
                  Access Request
                </span>
              </div>
              <h2 className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-black text-transparent">
                Request View Access
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                <svg
                  className="h-4 w-4"
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
                {profileName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-800/60 text-slate-400 transition-all hover:border-white/30 hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 shadow-lg shadow-rose-500/20">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-200">
                  !
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-100">{error}</p>
                  {error.includes("Company name is required") && (
                    <a
                      href="/profile/settings"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      Update Profile Settings
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
              <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
              Personal Message
              <span className="ml-auto text-xs font-normal text-slate-500">
                (Optional)
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              placeholder="Hi! I'd love to learn more about your experience with..."
              maxLength={500}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-cyan-500/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {message.length}/500 characters
              </p>
              <div className="flex items-center gap-1">
                {message.length > 0 && (
                  <span className="text-xs text-emerald-400">✓ Looks good</span>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold leading-relaxed text-cyan-100">
                  The candidate will be notified via email and can approve or
                  decline your request. You will only have access for the
                  duration they approve.
                </p>
              </div>
            </div>
          </div>

          {/* Duration selector */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
              <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
              Access Duration
              <span className="ml-auto text-xs font-normal text-slate-500">
                Required
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {durationOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setDurationPreset(option.id as DurationPreset)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    durationPreset === option.id
                      ? "border-cyan-400/60 bg-cyan-500/10 text-white"
                      : "border-white/10 bg-slate-900/40 text-slate-300 hover:border-white/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-slate-400">
                    {option.id === "1_hour" && "Good for quick reviews"}
                    {option.id === "1_day" && "Expires in 24 hours"}
                    {option.id === "1_week" && "Covers full interview cycle"}
                    {option.id === "1_month" && "Longer-term collaboration"}
                    {option.id === "custom_days" &&
                      `Choose up to ${MAX_CUSTOM_DAYS} days`}
                  </p>
                </button>
              ))}
            </div>
            {durationPreset === "custom_days" && (
              <div className="mt-4">
                <label
                  htmlFor="custom-days"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Custom duration (days)
                </label>
                <input
                  id="custom-days"
                  type="number"
                  min={1}
                  max={MAX_CUSTOM_DAYS}
                  value={customDays}
                  onChange={(event) =>
                    setCustomDays(parseInt(event.target.value, 10) || 0)
                  }
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white shadow-inner shadow-black/30 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            )}
            {durationError && (
              <p className="mt-3 text-sm text-rose-400">{durationError}</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Access starts when the candidate approves. Timezone:{" "}
              {timezoneRef.current}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 px-5 py-3 font-bold text-white transition-all hover:border-white/30 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Request View Access
                  </>
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
