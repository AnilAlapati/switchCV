"use client";

import { logger } from "@/lib/logger";

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";
import { AccessRequestHeader } from "./request-access/AccessRequestHeader";
import { ErrorAlert } from "./request-access/ErrorAlert";
import { MessageField } from "./request-access/MessageField";
import { DurationSelector } from "./request-access/DurationSelector";
import { ActionButtons } from "./request-access/ActionButtons";

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
      logger.error({ err: errorMsg }, "Request error:");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2F25]/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-500/10 md:flex-row"
      >
        {/* Left Sidebar - Duration Selector */}
        <div className="w-full border-b border-emerald-50 bg-emerald-50/30 p-6 md:w-80 md:border-b-0 md:border-r md:overflow-y-auto">
          <DurationSelector
            selectedPreset={durationPreset}
            onSelectPreset={setDurationPreset}
            customDays={customDays}
            onCustomDaysChange={setCustomDays}
            loading={loading}
            durationError={durationError}
            timezone={timezoneRef.current}
          />
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col bg-white">
          <AccessRequestHeader profileName={profileName} onClose={onClose} />

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <ErrorAlert error={error} />

            <div className="space-y-6">
              <MessageField
                message={message}
                onChange={setMessage}
                loading={loading}
              />

              {/* Info Box */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
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
                    <p className="text-xs font-medium leading-relaxed text-[#1A2F25]/70">
                      The candidate will be notified via email and can approve
                      or decline your request. You will only have access for the
                      duration they approve.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <ActionButtons loading={loading} onClose={onClose} />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
