import {
  DURATION_PRESETS,
  MAX_CUSTOM_DAYS,
  formatDurationLabel,
  hoursToDays,
} from "@/lib/accessDuration";
import type { DashboardAccessRequest, DurationFormState } from "./types";

export function buildDefaultDurationState(
  requested?: DashboardAccessRequest["requestedDuration"]
): DurationFormState {
  if (!requested) {
    return { preset: "1_week", customDays: 7, error: null };
  }

  if (requested.isCustom) {
    return {
      preset: "custom_days",
      customDays: Math.max(1, Math.round(hoursToDays(requested.durationHours))),
      error: null,
    };
  }

  return {
    preset: requested.preset,
    customDays: Math.max(1, Math.round(hoursToDays(requested.durationHours))),
    error: null,
  };
}

export function validateDuration(
  request: DashboardAccessRequest,
  state: DurationFormState
): { valid: boolean; error?: string } {
  const maxHours =
    request.requestedDuration?.durationHours ?? 24 * MAX_CUSTOM_DAYS;

  if (state.preset === "custom_days") {
    if (!state.customDays || state.customDays < 1) {
      return { valid: false, error: "Custom duration must be at least 1 day" };
    }
    if (state.customDays > hoursToDays(maxHours)) {
      return {
        valid: false,
        error: `You can grant up to ${Math.floor(
          hoursToDays(maxHours)
        )} days for this request`,
      };
    }
    return { valid: true };
  }

  const preset = DURATION_PRESETS.find((p) => p.preset === state.preset);
  if (preset && preset.durationHours > maxHours) {
    return {
      valid: false,
      error: `Requested duration is limited to ${formatDurationLabel(
        request.requestedDuration
      )}`,
    };
  }

  return { valid: true };
}
