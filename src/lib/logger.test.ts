/**
 * Tests for lib/logger utility
 */

import { logger } from "@/lib/logger";

describe("Logger Utility", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe("logger API", () => {
    it("should have log, error, warn, and info methods", () => {
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
    });

    it("should accept multiple arguments", () => {
      const obj = { key: "value" };
      const arr = [1, 2, 3];

      expect(() => {
        logger.log("message", obj, arr, 42);
        logger.error("error", obj, arr);
        logger.warn("warning", obj);
        logger.info("info", arr);
      }).not.toThrow();
    });
  });

  describe("logging behavior in jsdom test environment", () => {
    it("should not call console.log for log messages", () => {
      logger.log("test message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should not call console.warn for warn messages", () => {
      logger.warn("warning message");

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should not call console.info for info messages", () => {
      logger.info("info message");

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("should not call console.error for error messages in jsdom environment", () => {
      // In jsdom (client-side simulation), window is defined, so errors don't log
      logger.error("error message");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle multiple arguments without throwing", () => {
      const obj = { key: "value" };
      const arr = [1, 2, 3];

      expect(() => {
        logger.error("error message", obj, arr, 42);
      }).not.toThrow();

      // In jsdom, it shouldn't actually log
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("logger functionality", () => {
    it("should not throw when called with various argument types", () => {
      expect(() => {
        logger.log();
        logger.error(null);
        logger.warn(undefined);
        logger.info(42, true, "string");
      }).not.toThrow();
    });

    it("should maintain consistent behavior across calls", () => {
      logger.error("first error");
      logger.error("second error");

      // In jsdom environment, errors don't log, so call count should be 0
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    });
  });
});
