"use client";

import { DURATION_PRESETS, MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";

interface PendingAccessControlsProps {
  ownerTimezone: string;
  recruiterTimezone?: string | null;
  currentPreset: DurationPreset;
  customDays: number;
  error?: string | null;
  loading: boolean;
  requestedLabel: string;
  maxHours: number;
  onPresetChange: (preset: DurationPreset) => void;
  onCustomDaysChange: (value: number) => void;
  onApprove: () => void;
  onDeny: () => void;
}

export function PendingAccessControls({
  ownerTimezone,
  recruiterTimezone,
  currentPreset,
  customDays,
  error,
  loading,
  requestedLabel,
  maxHours,
  onPresetChange,
  onCustomDaysChange,
  onApprove,
  onDeny,
}: PendingAccessControlsProps) {
  return (
    <div className="flex w-full flex-col gap-4 md:w-auto">
      <div className="flex flex-col gap-2 rounded-lg border border-[#1A2F25]/10 bg-white/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1A2F25]/60">
          Share duration
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((option) => {
            const isDisabled = option.durationHours > maxHours;
            const isActive = currentPreset === option.preset;
            return (
              <button
                key={option.preset}
                type="button"
                disabled={loading || isDisabled}
                onClick={() => onPresetChange(option.preset)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${isActive
                    ? "bg-[#2C4A3B] text-white shadow-md shadow-[#2C4A3B]/20"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  } ${isDisabled ? "opacity-40" : ""}`}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={loading}
            onClick={() => onPresetChange("custom_days")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${currentPreset === "custom_days"
                ? "bg-[#2C4A3B] text-white shadow-md shadow-[#2C4A3B]/20"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            Custom
          </button>
        </div>
        {currentPreset === "custom_days" && (
          <input
            type="number"
            min={1}
            max={MAX_CUSTOM_DAYS}
            value={customDays}
            onChange={(event) =>
              onCustomDaysChange(parseInt(event.target.value, 10) || 0)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1A2F25] focus:border-[#2C4A3B] focus:ring-1 focus:ring-[#2C4A3B] outline-none transition-all"
            placeholder="Days"
          />
        )}
        <p className="text-[11px] text-[#1A2F25]/50">
          Recruiter requested {requestedLabel}
          {recruiterTimezone ? ` (${recruiterTimezone})` : ""}. Sharing will use
          your timezone ({ownerTimezone}).
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDeny}
          disabled={loading}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="px-4 py-2 bg-[#2C4A3B] hover:bg-[#1A2F25] text-white rounded-lg transition-all shadow-md shadow-[#2C4A3B]/20 font-medium hover:scale-[1.02]"
        >
          Share Access
        </button>
      </div>
    </div>
  );
}
