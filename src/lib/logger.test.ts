/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tests for lib/logger utility
 */

describe("Logger Utility", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();

    originalEnv = process.env;
    jest.resetModules();
  });

  afterEach(() => {
    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();

    process.env = originalEnv;
  });

  describe("in development environment", () => {
    let logger: Record<string, unknown>;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: "development" };
      logger = require("@/lib/logger").logger;
    });

    it("should call console.log", () => {
      logger.log("test");
      expect(consoleLogSpy).toHaveBeenCalledWith("test");
    });

    it("should call console.warn", () => {
      logger.warn("test");
      expect(consoleWarnSpy).toHaveBeenCalledWith("test");
    });

    it("should call console.info", () => {
      logger.info("test");
      expect(consoleInfoSpy).toHaveBeenCalledWith("test");
    });

    it("should call console.error", () => {
      logger.error("test");
      expect(consoleErrorSpy).toHaveBeenCalledWith("test");
    });
  });

  describe("in production environment", () => {
    let logger: Record<string, unknown>;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: "production" };
      logger = require("@/lib/logger").logger;
    });

    it("should NOT call console.log", () => {
      logger.log("test");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should NOT call console.warn", () => {
      logger.warn("test");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should NOT call console.info", () => {
      logger.info("test");
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("should NOT call console.error in browser (window defined)", () => {
      // jsdom defines window
      logger.error("test");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
