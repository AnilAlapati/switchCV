/**
 * Tests for lib/formatDate utility
 */

import { formatDate } from "@/lib/formatDate";

describe("formatDate Utility", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return 'Unknown date' for null or undefined", () => {
    expect(formatDate(null)).toBe("Unknown date");
    expect(formatDate(undefined)).toBe("Unknown date");
  });

  it("should return 'Just now' for dates less than 60 seconds ago", () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(thirtySecondsAgo)).toBe("Just now");
  });

  it("should return minutes for dates less than 60 minutes ago", () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(thirtyMinutesAgo)).toBe("30m ago");
  });

  it("should return hours for dates less than 24 hours ago", () => {
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 3600 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(fiveHoursAgo)).toBe("5h ago");
  });

  it("should return days for dates less than 7 days ago", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(threeDaysAgo)).toBe("3d ago");
  });

  it("should return formatted date for dates older than 7 days", () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);

    jest.setSystemTime(now);
    const formatted = formatDate(thirtyDaysAgo);

    expect(formatted).not.toContain("m ago");
    expect(formatted).not.toContain("h ago");
    expect(formatted).not.toContain("d ago");
    expect(formatted).not.toContain("Just now");
  });

  it("should handle exact 1 minute boundary", () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(oneMinuteAgo)).toBe("1m ago");
  });

  it("should handle exact 1 hour boundary", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(oneHourAgo)).toBe("1h ago");
  });

  it("should handle exact 1 day boundary", () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(oneDayAgo)).toBe("1d ago");
  });

  it("should handle exact 7 days boundary", () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);

    jest.setSystemTime(now);
    const formatted = formatDate(sevenDaysAgo);

    expect(formatted).not.toContain("d ago");
  });

  it("should correctly count minutes", () => {
    const now = new Date();
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(fortyFiveMinutesAgo)).toBe("45m ago");
  });

  it("should correctly count hours", () => {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 3600 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(twelveHoursAgo)).toBe("12h ago");
  });

  it("should correctly count days", () => {
    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * 86400 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(sixDaysAgo)).toBe("6d ago");
  });

  it("should work with dates in the past", () => {
    const now = new Date();
    const pastDate = new Date("2020-01-01");

    jest.setSystemTime(now);
    const formatted = formatDate(pastDate);

    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should floor the time units correctly", () => {
    const now = new Date();
    const fiftyNineMinutesAgo = new Date(now.getTime() - 59.9 * 60 * 1000);

    jest.setSystemTime(now);
    expect(formatDate(fiftyNineMinutesAgo)).toBe("59m ago");
  });

  it("should return localized date string for old dates", () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 30 * 86400 * 1000);

    jest.setSystemTime(now);
    const formatted = formatDate(oldDate);

    // Should be in localized format, not relative
    expect(formatted).toMatch(/\d+\/\d+\/\d+/);
  });
});
