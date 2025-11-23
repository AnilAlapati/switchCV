/**
 * @jest-environment node
 */
import { getWindow } from "./window";

describe("window utils", () => {
  it("should return null when window is undefined (server-side)", () => {
    expect(getWindow()).toBeNull();
  });

  it("should return window object when window is defined (client-side simulation)", () => {
    const mockWindow = { name: "mockWindow" };
    // @ts-expect-error - Manually defining window for test
    global.window = mockWindow;

    expect(getWindow()).toBe(mockWindow);

    // Cleanup
    // @ts-expect-error - Cleaning up
    delete global.window;
  });
});
