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
        <label className="flex items-center gap-2 text-sm font-bold text-[#1A2F25]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Select Duration
        </label>
        <span className="text-[10px] font-medium text-emerald-600/60 font-bold uppercase tracking-wider">Required</span>
      </div>

      <div className="space-y-2">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={loading}
            onClick={() => onSelectPreset(option.id as DurationPreset)}
            className={`group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${selectedPreset === option.id
                ? "border-emerald-200 bg-white shadow-lg shadow-emerald-500/10"
                : "border-transparent bg-white/40 hover:bg-white/60"
              }`}
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-semibold ${selectedPreset === option.id
                      ? "text-[#1A2F25]"
                      : "text-[#1A2F25]/70 group-hover:text-[#1A2F25]"
                    }`}
                >
                  {option.label}
                </p>
                <p
                  className={`text-[11px] ${selectedPreset === option.id
                      ? "text-emerald-600/80"
                      : "text-emerald-600/40 group-hover:text-emerald-600/60"
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
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
            className="mb-2 block text-xs font-medium text-[#1A2F25]/60"
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
              className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-[#1A2F25] shadow-inner transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#1A2F25]/40">
              days
            </div>
          </div>
        </div>
      )}

      {durationError && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {durationError}
        </div>
      )}

      <div className="rounded-lg bg-emerald-50/50 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-emerald-700/60">
          Access starts upon approval. Timezone: {timezone}
        </p>
      </div>
    </div>
  );
}
