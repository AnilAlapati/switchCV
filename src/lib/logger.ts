import pino, { LoggerOptions } from "pino";

const env = process.env.NODE_ENV || "development";
const logLevel = process.env.LOG_LEVEL || "info";
const isProd = env === "production";
const isTestRuntime = env === "test" || Boolean(process.env.JEST_WORKER_ID);
const shouldMirrorConsole = !isProd;

const transport: LoggerOptions["transport"] =
  !isProd && !isTestRuntime
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      }
    : undefined;

const baseLogger = pino({
  level: logLevel,
  transport,
  base: {
    env,
  },
});

type LoggerWithLog = typeof baseLogger & { log: typeof baseLogger.info };

const mirrorToConsole = (
  consoleMethod: (...args: unknown[]) => void,
  pinoMethod: (...args: unknown[]) => void
) => {
  return (...args: unknown[]) => {
    pinoMethod(...args);
    if (shouldMirrorConsole) {
      consoleMethod(...args);
    }
  };
};

const logger = baseLogger as LoggerWithLog;
const boundInfo = baseLogger.info.bind(baseLogger);
const boundWarn = baseLogger.warn.bind(baseLogger);
const boundError = baseLogger.error.bind(baseLogger);

logger.log = mirrorToConsole(console.log, boundInfo);
logger.info = mirrorToConsole(console.info, boundInfo);
logger.warn = mirrorToConsole(console.warn, boundWarn);
logger.error = mirrorToConsole(console.error, boundError);

export const logError = (error: unknown, context?: string) => {
  if (error instanceof Error) {
    logger.error({ err: error, context }, error.message);
  } else {
    logger.error({ err: error, context }, "Unknown error occurred");
  }
};

export { logger };
export default logger;
