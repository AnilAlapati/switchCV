import {
  calculateRetentionStatus,
  getRetentionBadgeColor,
  formatTimeRemaining,
  getRetentionTooltipMessage,
} from "../resumeRetention";

describe("resumeRetention utility", () => {
  describe("calculateRetentionStatus", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString();

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3);
    const warningDateStr = warningDate.toISOString();

    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 1);
    urgentDate.setHours(urgentDate.getHours() + 5); // 29h roughly
    const urgentDateStr = urgentDate.toISOString();

    const criticalDate = new Date();
    criticalDate.setHours(criticalDate.getHours() + 5); // 5h
    const criticalDateStr = criticalDate.toISOString();

    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 5);
    const expiredDateStr = expiredDate.toISOString();

    it("should return safe status for premium users", () => {
      const status = calculateRetentionStatus(futureDateStr, null, "premium");
      expect(status.isExpiring).toBe(false);
      expect(status.urgencyLevel).toBe("safe");
    });

    it("should return safe status for enterprise users", () => {
      const status = calculateRetentionStatus(
        futureDateStr,
        null,
        "enterprise",
      );
      expect(status.isExpiring).toBe(false);
      expect(status.urgencyLevel).toBe("safe");
    });

    it("should return safe status when no dates are provided", () => {
      const status = calculateRetentionStatus(null, undefined, "basic");
      expect(status.isExpiring).toBe(false);
      expect(status.urgencyLevel).toBe("safe");
    });

    it("should handle invalid dates by returning safe status", () => {
      const status = calculateRetentionStatus("", "", "basic");
      expect(status.isExpiring).toBe(false);
      expect(status.urgencyLevel).toBe("safe");
    });

    it("should return safe when both dates are empty strings", () => {
      const status = calculateRetentionStatus("", "", "basic");
      expect(status.urgencyLevel).toBe("safe");
    });

    it("should return safe status for dates more than 3 days away", () => {
      const status = calculateRetentionStatus(futureDateStr, null, "basic");
      expect(status.urgencyLevel).toBe("safe");
      expect(status.daysRemaining).toBe(4); // floor((5*24-0)/24) approx 4 or 5 depending on when now is
    });

    it("should return warning status for 2-3 days remaining", () => {
      const status = calculateRetentionStatus(warningDateStr, null, "basic");
      expect(status.urgencyLevel).toBe("warning");
    });

    it("should return urgent status for ~1 day remaining", () => {
      const status = calculateRetentionStatus(urgentDateStr, null, "basic");
      expect(status.urgencyLevel).toBe("urgent");
    });

    it("should return critical status for less than 24 hours remaining", () => {
      const status = calculateRetentionStatus(criticalDateStr, null, "basic");
      expect(status.urgencyLevel).toBe("critical");
    });

    it("should use expiresAt fallback if deletionScheduledAt is missing", () => {
      const status = calculateRetentionStatus(null, futureDateStr, "basic");
      expect(status.isExpiring).toBe(true);
      expect(status.expirationDate?.toISOString()).toBe(futureDateStr);
    });

    it("should handle expired documents", () => {
      const status = calculateRetentionStatus(expiredDateStr, null, "basic");
      expect(status.isExpiring).toBe(false); // getTime() - now() < 0
      expect(status.formattedTimeRemaining).toBe("Expired");
    });
  });

  describe("getRetentionBadgeColor", () => {
    it("should return red for critical", () => {
      const colors = getRetentionBadgeColor("critical");
      expect(colors.text).toContain("red");
    });

    it("should return orange for urgent", () => {
      const colors = getRetentionBadgeColor("urgent");
      expect(colors.text).toContain("orange");
    });

    it("should return amber for warning", () => {
      const colors = getRetentionBadgeColor("warning");
      expect(colors.text).toContain("amber");
    });

    it("should return emerald for safe", () => {
      const colors = getRetentionBadgeColor("safe");
      expect(colors.text).toContain("emerald");
    });
  });

  describe("formatTimeRemaining", () => {
    it("should format hours correctly", () => {
      expect(formatTimeRemaining(0, 5)).toBe("5h remaining");
    });

    it("should format 1 day correctly", () => {
      expect(formatTimeRemaining(1, 25)).toBe("1 day remaining");
    });

    it("should format multiple days correctly", () => {
      expect(formatTimeRemaining(5, 120)).toBe("5 days remaining");
    });

    it("should handle negative hours", () => {
      expect(formatTimeRemaining(-1, -5)).toBe("Expired");
    });
  });

  describe("getRetentionTooltipMessage", () => {
    it("should return default message if not expiring", () => {
      const status = calculateRetentionStatus(null, null, "basic");
      expect(getRetentionTooltipMessage(status)).toContain("no expiration");
    });

    it("should return critical message with hours", () => {
      const d = new Date();
      d.setHours(d.getHours() + 5);
      const status = calculateRetentionStatus(d.toISOString(), null, "basic");
      expect(getRetentionTooltipMessage(status)).toContain("5h");
    });

    it("should return date message for warning status", () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const status = calculateRetentionStatus(d.toISOString(), null, "basic");
      expect(getRetentionTooltipMessage(status)).toContain(
        "permanently deleted on",
      );
    });

    it("should return fallback message if dates available but urgency high", () => {
      // Mock status partially
      const status: any = {
        isExpiring: true,
        urgencyLevel: "warning",
        deletionDate: null,
      };
      expect(getRetentionTooltipMessage(status)).toContain("expire soon");
    });
  });
});
