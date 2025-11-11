// src/__tests__/setup.test.ts
describe("Test Setup", () => {
  it("should pass a basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle basic string operations", () => {
    const greeting = "Hello, SwitchCV!";
    expect(greeting).toContain("SwitchCV");
    expect(greeting.length).toBeGreaterThan(0);
  });
});
