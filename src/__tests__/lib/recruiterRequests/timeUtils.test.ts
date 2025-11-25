import {
  deriveTimeState,
  formatDateTime,
  formatDuration,
} from "@/lib/recruiterRequests/timeUtils";

describe("recruiterRequests/timeUtils", () => {
  describe("deriveTimeState", () => {
    it("uses provided remaining milliseconds when available", () => {
      const state = deriveTimeState({ timeRemainingMs: 3 * 60 * 60 * 1000 }, 0);
      expect(state).toEqual({ expired: false, label: "3h 0m" });
    });

    it("derives remaining time from expiresAt when needed", () => {
      const now = new Date("2025-01-01T00:00:00Z").getTime();
      const expires = new Date("2025-01-02T05:30:00Z").toISOString();
      const state = deriveTimeState({ expiresAt: expires }, now);
      expect(state).toEqual({ expired: false, label: "1d 5h" });
    });

    it("marks the state as expired when remaining time is non-positive", () => {
      const state = deriveTimeState({ timeRemainingMs: -1000 }, Date.now());
      expect(state).toEqual({ expired: true, label: "Expired" });
    });

    it("falls back to awaiting expiration when no metadata exists", () => {
      const state = deriveTimeState({}, Date.now());
      expect(state).toEqual({ expired: false, label: "Awaiting expiration" });
    });
  });

  describe("formatDuration", () => {
    it("returns at least one minute", () => {
      expect(formatDuration(30 * 1000)).toBe("1m");
    });

    it("formats hours and minutes", () => {
      expect(formatDuration(2.5 * 60 * 60 * 1000)).toBe("2h 30m");
    });

    it("formats days and hours", () => {
      expect(formatDuration(3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)).toBe(
        "3d 2h"
      );
    });
  });

  describe("formatDateTime", () => {
    it("returns placeholders when value missing", () => {
      expect(formatDateTime(undefined)).toBe("--");
      expect(formatDateTime("invalid-date")).toBe("--");
    });
  });
});
