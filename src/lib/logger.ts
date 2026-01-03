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
      // Better console logging for Error objects inside wrapper objects
      const processedArgs = args.map((arg) => {
        if (arg && typeof arg === "object" && "err" in arg) {
          const err = arg.err;
          // Handle Error objects
          if (err instanceof Error) {
            const { message, stack, name, ...otherProps } = err;
            return {
              ...arg,
              err: {
                message,
                stack,
                name,
                ...otherProps,
              },
            };
          }
          // Handle Response objects
          if (
            err &&
            typeof err === "object" &&
            "status" in err &&
            "statusText" in err
          ) {
            return {
              ...arg,
              err: {
                type: "Response",
                status: (err as Response).status,
                statusText: (err as Response).statusText,
                url: (err as Response).url,
              },
            };
          }
          // Handle non-Error objects (could be plain object, etc.)
          if (err && typeof err === "object") {
            // Try to extract enumerable properties
            const enumerableProps = Object.keys(err).reduce((acc, key) => {
              acc[key] = (err as Record<string, unknown>)[key];
              return acc;
            }, {} as Record<string, unknown>);

            // If no enumerable properties, try common error-like properties
            if (Object.keys(enumerableProps).length === 0) {
              const errorLikeProps: Record<string, unknown> = {
                type: err.constructor?.name || "Object",
              };

              // Try to get common properties that might not be enumerable
              const commonProps = [
                "message",
                "code",
                "status",
                "statusCode",
                "name",
                "reason",
              ];
              for (const prop of commonProps) {
                if (prop in err) {
                  errorLikeProps[prop] = (err as Record<string, unknown>)[prop];
                }
              }

              return {
                ...arg,
                err:
                  Object.keys(errorLikeProps).length > 1
                    ? errorLikeProps
                    : String(err),
              };
            }

            return {
              ...arg,
              err: {
                type: err.constructor?.name || "Object",
                ...enumerableProps,
              },
            };
          }
          // Handle primitives or null/undefined
          return {
            ...arg,
            err: String(err),
          };
        }
        return arg;
      });
      consoleMethod(...processedArgs);
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
