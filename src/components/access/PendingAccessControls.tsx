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
      <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              currentPreset === "custom_days"
                ? "bg-cyan-500/20 text-cyan-200"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white"
            placeholder="Days"
          />
        )}
        <p className="text-[11px] text-slate-500">
          Recruiter requested {requestedLabel}
          {recruiterTimezone ? ` (${recruiterTimezone})` : ""}. Sharing will use
          your timezone ({ownerTimezone}).
        </p>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDeny}
          disabled={loading}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors font-medium"
        >
          Share Access
        </button>
      </div>
    </div>
  );
}
