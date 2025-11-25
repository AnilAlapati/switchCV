export type DurationPreset =
  | "1_hour"
  | "1_day"
  | "1_week"
  | "1_month"
  | "custom_days";

export interface DurationSelectionInput {
  preset: DurationPreset;
  customDays?: number;
}

export interface NormalizedDuration {
  preset: DurationPreset;
  value: number;
  unit: "hour" | "day" | "week" | "month";
  durationHours: number;
  durationMs: number;
  label: string;
  timezone: string;
  isCustom: boolean;
}

interface PresetConfig {
  preset: DurationPreset;
  label: string;
  unit: NormalizedDuration["unit"];
  value: number;
  durationHours: number;
}

const HOURS_IN_DAY = 24;
const HOURS_IN_WEEK = HOURS_IN_DAY * 7;
const HOURS_IN_MONTH = HOURS_IN_DAY * 30; // Base month on 30-day window for consistency

export const MAX_CUSTOM_DAYS = 365;
export const MIN_CUSTOM_DAYS = 1;

export const DURATION_PRESETS: PresetConfig[] = [
  {
    preset: "1_hour",
    label: "1 Hour",
    unit: "hour",
    value: 1,
    durationHours: 1,
  },
  {
    preset: "1_day",
    label: "1 Day",
    unit: "day",
    value: 1,
    durationHours: HOURS_IN_DAY,
  },
  {
    preset: "1_week",
    label: "1 Week",
    unit: "week",
    value: 1,
    durationHours: HOURS_IN_WEEK,
  },
  {
    preset: "1_month",
    label: "1 Month",
    unit: "month",
    value: 1,
    durationHours: HOURS_IN_MONTH,
  },
];

function hoursToMilliseconds(hours: number) {
  return hours * 60 * 60 * 1000;
}

export function normalizeDuration(
  input: DurationSelectionInput,
  timezone: string
): NormalizedDuration {
  if (!input || !input.preset) {
    throw new Error("Duration preset is required");
  }

  if (input.preset === "custom_days") {
    const rawValue = input.customDays;
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);

    if (!Number.isFinite(value) || value < MIN_CUSTOM_DAYS) {
      throw new Error("Custom duration must be at least 1 day");
    }

    if (value > MAX_CUSTOM_DAYS) {
      throw new Error(`Custom duration cannot exceed ${MAX_CUSTOM_DAYS} days`);
    }

    const durationHours = value * HOURS_IN_DAY;
    return {
      preset: "custom_days",
      value,
      unit: "day",
      durationHours,
      durationMs: hoursToMilliseconds(durationHours),
      label: `${value} ${value === 1 ? "Day" : "Days"}`,
      timezone,
      isCustom: true,
    };
  }

  const preset = DURATION_PRESETS.find((p) => p.preset === input.preset);
  if (!preset) {
    throw new Error("Unsupported duration preset");
  }

  return {
    ...preset,
    durationMs: hoursToMilliseconds(preset.durationHours),
    timezone,
    isCustom: false,
  };
}

export function formatDurationLabel(duration?: NormalizedDuration | null) {
  if (!duration) {
    return "—";
  }

  if (duration.isCustom) {
    return duration.label;
  }

  const preset = DURATION_PRESETS.find((p) => p.preset === duration.preset);
  return preset?.label ?? duration.label;
}

export function hoursToDays(hours: number) {
  return hours / HOURS_IN_DAY;
}
