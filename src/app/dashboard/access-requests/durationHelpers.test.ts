import { buildDefaultDurationState, validateDuration } from "./durationHelpers";
import { DashboardAccessRequest, DurationFormState } from "./types";
import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";

describe("durationHelpers", () => {
  describe("buildDefaultDurationState", () => {
    it("should return default state when requested is undefined", () => {
      const result = buildDefaultDurationState(undefined);
      expect(result).toEqual({ preset: "1_week", customDays: 7, error: null });
    });

    it("should return custom state when requested is custom", () => {
      const requested = {
        isCustom: true,
        durationHours: 48,
        preset: "custom_days" as any,
      } as any;
      const result = buildDefaultDurationState(requested);
      expect(result).toEqual({
        preset: "custom_days",
        customDays: 2,
        error: null,
      });
    });

    it("should return preset state when requested is not custom", () => {
      const requested = {
        isCustom: false,
        durationHours: 24,
        preset: "1_day" as any,
      } as any;
      const result = buildDefaultDurationState(requested);
      expect(result).toEqual({ preset: "1_day", customDays: 1, error: null });
    });

    it("should handle rounding and minimum value for custom days", () => {
      const requested = {
        isCustom: true,
        durationHours: 10, // less than 1 day
        preset: "custom_days" as any,
      } as any;
      const result = buildDefaultDurationState(requested);
      expect(result.customDays).toBe(1);
    });
  });

  describe("validateDuration", () => {
    const mockRequest: DashboardAccessRequest = {
      id: "1",
      fromUserName: "Test",
      message: "Test",
      timestamp: new Date().toISOString(),
      resumeId: "res-1",
      resumeTitle: "Resume",
      status: "pending",
      requestedDuration: {
        durationHours: 24 * 7, // 1 week
        preset: "1_week",
        isCustom: false,
        label: "1 Week",
      } as any,
    };

    it("should validate custom_days correctly within limits", () => {
      const state: DurationFormState = {
        preset: "custom_days",
        customDays: 5,
        error: null,
      };
      const result = validateDuration(mockRequest, state);
      expect(result.valid).toBe(true);
    });

    it("should return error for custom_days less than 1", () => {
      const state: DurationFormState = {
        preset: "custom_days",
        customDays: 0,
        error: null,
      };
      const result = validateDuration(mockRequest, state);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Custom duration must be at least 1 day");
    });

    it("should return error for custom_days exceeding requested duration", () => {
      const state: DurationFormState = {
        preset: "custom_days",
        customDays: 10,
        error: null,
      };
      const result = validateDuration(mockRequest, state);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("You can grant up to 7 days");
    });

    it("should validate preset correctly within limits", () => {
      const state: DurationFormState = {
        preset: "1_day",
        customDays: 1,
        error: null,
      };
      const result = validateDuration(mockRequest, state);
      expect(result.valid).toBe(true);
    });

    it("should return error for preset exceeding requested duration", () => {
      const shortRequest = {
        ...mockRequest,
        requestedDuration: {
          durationHours: 24, // 1 day
          preset: "1_day",
          isCustom: false,
          label: "1 Day",
        } as any,
      };
      const state: DurationFormState = {
        preset: "1_week",
        customDays: 7,
        error: null,
      };
      const result = validateDuration(shortRequest, state);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Requested duration is limited to 1 Day");
    });

    it("should use default max hours if requestedDuration is missing", () => {
      const requestNoDuration = {
        ...mockRequest,
        requestedDuration: undefined,
      };
      const state: DurationFormState = {
        preset: "custom_days",
        customDays: MAX_CUSTOM_DAYS + 1,
        error: null,
      };
      const result = validateDuration(requestNoDuration, state);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(
        `You can grant up to ${MAX_CUSTOM_DAYS} days`
      );
    });

    it("should return valid for unknown preset if it doesn't exceed max", () => {
      const state: DurationFormState = {
        preset: "unknown" as any,
        customDays: 1,
        error: null,
      };
      const result = validateDuration(mockRequest, state);
      expect(result.valid).toBe(true);
    });
  });
});
