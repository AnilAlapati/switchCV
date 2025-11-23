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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          Select Duration
        </label>
        <span className="text-xs font-medium text-slate-500">Required</span>
      </div>

      <div className="space-y-2">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={loading}
            onClick={() => onSelectPreset(option.id as DurationPreset)}
            className={`group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
              selectedPreset === option.id
                ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]"
                : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    selectedPreset === option.id
                      ? "text-cyan-100"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  {option.label}
                </p>
                <p
                  className={`text-xs ${
                    selectedPreset === option.id
                      ? "text-cyan-200/70"
                      : "text-slate-500 group-hover:text-slate-400"
                  }`}
                >
                  {option.id === "1_hour" && "Quick review"}
                  {option.id === "1_day" && "24 hours access"}
                  {option.id === "1_week" && "Standard process"}
                  {option.id === "1_month" && "Long-term"}
                  {option.id === "custom_days" && "Custom range"}
                </p>
              </div>
              {selectedPreset === option.id && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow-sm">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedPreset === "custom_days" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <label
            htmlFor="custom-days"
            className="mb-2 block text-xs font-medium text-slate-400"
          >
            Enter number of days (max {MAX_CUSTOM_DAYS})
          </label>
          <div className="relative">
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
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white shadow-inner transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              days
            </div>
          </div>
        </div>
      )}

      {durationError && (
        <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
          {durationError}
        </div>
      )}

      <div className="rounded-lg bg-slate-950/30 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-slate-500">
          Access starts upon approval. Timezone: {timezone}
        </p>
      </div>
    </div>
  );
}
