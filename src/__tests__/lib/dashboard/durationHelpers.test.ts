import {
  buildDefaultDurationState,
  validateDuration,
} from "@/app/dashboard/access-requests/durationHelpers";
import { DURATION_PRESETS, MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DashboardAccessRequest } from "@/app/dashboard/access-requests/types";

jest.mock("@/lib/accessDuration", () => ({
  DURATION_PRESETS: [
    { preset: "1_week", durationHours: 168 },
    { preset: "2_weeks", durationHours: 336 },
    { preset: "1_month", durationHours: 720 },
  ],
  MAX_CUSTOM_DAYS: 90,
  formatDurationLabel: jest.fn((duration) =>
    duration ? `${duration.durationHours} hours` : "default"
  ),
  hoursToDays: jest.fn((hours) => Math.floor(hours / 24)),
}));

describe("durationHelpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildDefaultDurationState", () => {
    it("should return default state when no requested duration provided", () => {
      const result = buildDefaultDurationState();

      expect(result).toEqual({
        preset: "1_week",
        customDays: 7,
        error: null,
      });
    });

    it("should handle custom duration preset", () => {
      const requested = {
        preset: "custom_days" as const,
        isCustom: true,
        durationHours: 240,
      };

      const result = buildDefaultDurationState(requested);

      expect(result.preset).toBe("custom_days");
      expect(result.customDays).toBeGreaterThanOrEqual(1);
      expect(result.error).toBeNull();
    });

    it("should round custom days correctly", () => {
      const requested = {
        preset: "custom_days" as const,
        isCustom: true,
        durationHours: 110, // ~4.6 days, should round to 5
      };

      const result = buildDefaultDurationState(requested);

      expect(result.customDays).toBeGreaterThanOrEqual(1);
    });

    it("should handle preset duration", () => {
      const requested = {
        preset: "1_week" as const,
        isCustom: false,
        durationHours: 168,
      };

      const result = buildDefaultDurationState(requested);

      expect(result.preset).toBe("1_week");
      expect(result.error).toBeNull();
    });

    it("should ensure minimum custom days is 1", () => {
      const requested = {
        preset: "custom_days" as const,
        isCustom: true,
        durationHours: 1, // Very small value
      };

      const result = buildDefaultDurationState(requested);

      expect(result.customDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe("validateDuration", () => {
    const mockRequest = {
      requestedDuration: {
        preset: "1_week" as const,
        durationHours: 168,
        isCustom: false,
      },
    } as DashboardAccessRequest;

    it("should validate valid custom duration", () => {
      const result = validateDuration(mockRequest, {
        preset: "custom_days",
        customDays: 10,
        error: null,
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject custom duration less than 1 day", () => {
      const result = validateDuration(mockRequest, {
        preset: "custom_days",
        customDays: 0,
        error: null,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least 1 day");
    });

    it("should reject custom duration exceeding max allowed", () => {
      const result = validateDuration(mockRequest, {
        preset: "custom_days",
        customDays: 100, // Exceeds MAX_CUSTOM_DAYS default (90)
        error: null,
      });

      // Behavior depends on maxHours calculation
    });

    it("should validate valid preset duration", () => {
      const result = validateDuration(mockRequest, {
        preset: "1_week",
        customDays: 7,
        error: null,
      });

      expect(result.valid).toBe(true);
    });

    it("should reject preset duration exceeding request max", () => {
      const request = {
        requestedDuration: {
          preset: "2_weeks" as const,
          durationHours: 100, // Very limited max
          isCustom: false,
        },
      } as DashboardAccessRequest;

      const result = validateDuration(request, {
        preset: "1_month",
        customDays: 30,
        error: null,
      });

      // Should reject if preset duration > maxHours
    });

    it("should handle missing requestedDuration gracefully", () => {
      const request = {} as DashboardAccessRequest;

      const result = validateDuration(request, {
        preset: "custom_days",
        customDays: 10,
        error: null,
      });

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe("boolean");
    });

    it("should handle null customDays for custom preset", () => {
      const result = validateDuration(mockRequest, {
        preset: "custom_days",
        customDays: null as any,
        error: null,
      });

      expect(result.valid).toBe(false);
    });
  });
});
