
import sys
import os

file_path = "/Users/anilalapati/Development/Switch_cv_Nov_21/src/__tests__/hooks/useAccessControl.unit.test.ts"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    sys.exit(1)

with open(file_path, "r") as f:
    content = f.read()

new_describe_block = """  describe("AccessGrant type", () => {
    test("should create valid access grant", () => {
      const grant: AccessGrant = {
        grantId: "456",
        toUserId: "user-a",
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: {
            preset: "1_week",
            value: 1,
            unit: "week",
            durationHours: 168,
            durationMs: 604800000,
            label: "1 Week",
            isCustom: false
        },
      };

      expect(grant.grantId).toBe("456");
      expect(grant.duration?.preset).toBe("1_week");
    });

    test("should support 1hour duration", () => {
      const duration: AccessGrant["duration"] = {
          preset: "1_hour",
          value: 1,
          unit: "hour",
          durationHours: 1,
          durationMs: 3600000,
          label: "1 Hour",
          isCustom: false
      };
      expect(duration?.preset).toBe("1_hour");
    });

    test("should support 1day duration", () => {
      const duration: AccessGrant["duration"] = {
          preset: "1_day",
          value: 1,
          unit: "day",
          durationHours: 24,
          durationMs: 86400000,
          label: "1 Day",
          isCustom: false
      };
      expect(duration?.preset).toBe("1_day");
    });

    test("should support 1week duration", () => {
      const duration: AccessGrant["duration"] = {
          preset: "1_week",
          value: 1,
          unit: "week",
          durationHours: 168,
          durationMs: 604800000,
          label: "1 Week",
          isCustom: false
      };
      expect(duration?.preset).toBe("1_week");
    });

    test("should allow null expiry for forever", () => {
      const grant: AccessGrant = {
        grantId: "789",
        toUserId: "user-a",
        grantedAt: new Date(),
        expiresAt: null,
        duration: undefined,
      };

      expect(grant.expiresAt).toBeNull();
      expect(grant.duration).toBeUndefined();
    });
  });"""

# Find the start and end of the old describe block
start_marker = 'describe("AccessGrant type", () => {'
end_marker = '  describe("Date calculations", () => {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    content = content[:start_idx] + new_describe_block + "\n\n" + content[end_idx:]
    
    with open(file_path, "w") as f:
        f.write(content)
    print("Successfully updated file")
else:
    print("Could not find describe block markers in file")
