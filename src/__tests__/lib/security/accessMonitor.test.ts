import { checkSequentialAccess } from "@/lib/security/accessMonitor";

describe("Sequential Access Monitor", () => {
    const ip = "127.0.0.1";

    beforeEach(() => {
        // We can't easily clear the module-level map in this setup without exposing a clear function.
        // So we'll use different IPs for each test case or accept state persistence.
        // Ideally, we'd export a clear function for testing, but let's try unique IPs.
    });

    it("allows random access", async () => {
        const testIp = "random-access-ip";
        expect(await checkSequentialAccess(testIp, "100")).toBe(true);
        expect(await checkSequentialAccess(testIp, "500")).toBe(true);
        expect(await checkSequentialAccess(testIp, "900")).toBe(true);
    });

    it("detects and blocks sequential access", async () => {
        const testIp = "sequential-attacker-ip";

        // First 4 attempts should be allowed (MAX_SEQUENTIAL_ATTEMPTS = 5)
        expect(await checkSequentialAccess(testIp, "1000")).toBe(true);
        expect(await checkSequentialAccess(testIp, "1001")).toBe(true);
        expect(await checkSequentialAccess(testIp, "1002")).toBe(true);
        expect(await checkSequentialAccess(testIp, "1003")).toBe(true);

        // 5th attempt trigger block
        expect(await checkSequentialAccess(testIp, "1004")).toBe(false);

        // Subsequent attempts blocked
        expect(await checkSequentialAccess(testIp, "1005")).toBe(false);
    });

    it("resets on non-sequential access", async () => {
        const testIp = "reset-test-ip";
        expect(await checkSequentialAccess(testIp, "2000")).toBe(true);
        expect(await checkSequentialAccess(testIp, "2001")).toBe(true);

        // Break sequence
        expect(await checkSequentialAccess(testIp, "5000")).toBe(true);

        // Start new sequence
        expect(await checkSequentialAccess(testIp, "5001")).toBe(true);
        expect(await checkSequentialAccess(testIp, "5002")).toBe(true); // Count is 2 now, not 4
    });
});
