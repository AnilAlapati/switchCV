import { checkEdgeRateLimit } from "@/lib/utils/edgeRateLimit";

describe("Edge Rate Limiting Utility", () => {
    const windowMs = 1000;
    const limit = 5;

    beforeEach(() => {
        // We can't easily clear the module-level Map without exposing a clear method
        // But we can use unique identifiers for each test
    });

    it("should allow requests within the limit", () => {
        const ip = "test-ip-1";
        for (let i = 0; i < limit; i++) {
            const result = checkEdgeRateLimit(ip, limit, windowMs);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(limit - 1 - i);
        }
    });

    it("should block requests exceeding the limit", () => {
        const ip = "test-ip-2";
        // Consume all tokens
        for (let i = 0; i < limit; i++) {
            checkEdgeRateLimit(ip, limit, windowMs);
        }

        // Next request should fail
        const result = checkEdgeRateLimit(ip, limit, windowMs);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetIn).toBeGreaterThan(0);
    });

    it("should track identifiers independently", () => {
        const ip1 = "test-ip-3";
        const ip2 = "test-ip-4";

        // Consume all tokens for ip1
        for (let i = 0; i < limit; i++) {
            checkEdgeRateLimit(ip1, limit, windowMs);
        }

        // ip2 should still be allowed
        const result = checkEdgeRateLimit(ip2, limit, windowMs);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - 1);
    });

    it("should reset after the window expires", async () => {
        const ip = "test-ip-5";
        const shortWindow = 100; // 100ms

        // Consume limit
        for (let i = 0; i < limit; i++) {
            checkEdgeRateLimit(ip, limit, shortWindow);
        }

        // blocked
        expect(checkEdgeRateLimit(ip, limit, shortWindow).allowed).toBe(false);

        // wait for window
        await new Promise((resolve) => setTimeout(resolve, shortWindow + 50));

        // should be allowed again
        const result = checkEdgeRateLimit(ip, limit, shortWindow);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - 1);
    });
});
