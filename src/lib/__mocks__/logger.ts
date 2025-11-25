import { jest } from "@jest/globals";

const createLoggerMethod = () => jest.fn();

const logger = {
  log: createLoggerMethod(),
  info: createLoggerMethod(),
  warn: createLoggerMethod(),
  error: createLoggerMethod(),
};

export const logError = jest.fn();

export { logger };
export default logger;
