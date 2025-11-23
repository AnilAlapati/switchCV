import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";

const DURATION_OPTIONS: {
  id: DurationPreset | "custom_days";
  label: string;
}[] = [
  { id: "1_hour", label: "1 Hour" },
  { id: "1_day", label: "1 Day" },
  { id: "1_week", label: "1 Week" },
  { id: "1_month", label: "1 Month" },
  { id: "custom_days", label: "Custom Days" },
];

interface DurationSelectorProps {
  selectedPreset: DurationPreset;
  onSelectPreset: (preset: DurationPreset) => void;
  customDays: number;
  onCustomDaysChange: (value: number) => void;
  loading: boolean;
  durationError: string | null;
  timezone: string;
}

export function DurationSelector({
  selectedPreset,
  onSelectPreset,
  customDays,
  onCustomDaysChange,
  loading,
  durationError,
  timezone,
}: DurationSelectorProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
        <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
        Access Duration
        <span className="ml-auto text-xs font-normal text-slate-500">
          Required
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={loading}
            onClick={() => onSelectPreset(option.id as DurationPreset)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              selectedPreset === option.id
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
      {selectedPreset === "custom_days" && (
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
              onCustomDaysChange(parseInt(event.target.value, 10) || 0)
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
        Access starts when the candidate approves. Timezone: {timezone}
      </p>
    </div>
  );
}
