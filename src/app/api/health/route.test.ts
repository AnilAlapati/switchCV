/**
 * Health Endpoint Tests
 *
 * Tests for the health check API endpoint
 */

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("status", "ok");
  });

  it("returns valid timestamp", async () => {
    const response = await GET();
    const json = await response.json();

    expect(json).toHaveProperty("timestamp");
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
  });

  it("returns uptime as number", async () => {
    const response = await GET();
    const json = await response.json();

    expect(json).toHaveProperty("uptime");
    expect(typeof json.uptime).toBe("number");
    expect(json.uptime).toBeGreaterThanOrEqual(0);
  });

  it("returns all required fields", async () => {
    const response = await GET();
    const json = await response.json();

    expect(json).toEqual({
      status: "ok",
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
  });
});
