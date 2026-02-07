import pino, { LoggerOptions } from "pino";

/**
 * PII Redaction - Patterns for sensitive data
 * Prevents resume content, emails, phones, SSNs from appearing in logs
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(?:\+?1[-\s.]?)?\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // IP addresses (partial redaction - keep first 2 octets)
  ipv4: /(\d{1,3}\.\d{1,3}\.)\d{1,3}\.\d{1,3}/g,
} as const;

/**
 * Sensitive field names that should be redacted regardless of content
 */
const SENSITIVE_FIELDS = new Set([
  "resumeContent",
  "resumeData",
  "content",
  "personalStatement",
  "summary",
  "bio",
  "description",
  "skills",
  "experience",
  "education",
  "certifications",
  "password",
  "token",
  "apiKey",
  "secret",
  "authorization",
  "phoneNumber",
  "phone",
  "address",
  "streetAddress",
  "postalCode",
  "zipCode",
  "ssn",
  "creditCard",
  "cvv",
]);

/**
 * Redact PII from a string using regex patterns
 */
function redactPIIFromString(str: string): string {
  let redacted = str;
  // Process in order of specificity - more specific patterns first
  redacted = redacted.replace(PII_PATTERNS.creditCard, "[CARD_REDACTED]");
  redacted = redacted.replace(PII_PATTERNS.ssn, "[SSN_REDACTED]");
  redacted = redacted.replace(PII_PATTERNS.email, "[EMAIL_REDACTED]");
  redacted = redacted.replace(PII_PATTERNS.phone, "[PHONE_REDACTED]");
  redacted = redacted.replace(PII_PATTERNS.ipv4, "$1***.***");
  return redacted;
}

/**
 * Recursively sanitize objects to remove PII
 * @param obj - Object to sanitize
 * @param depth - Current recursion depth (prevents infinite loops)
 * @param maxDepth - Maximum recursion depth
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(
  obj: unknown,
  depth: number = 0,
  maxDepth: number = 5,
): unknown {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return "[MAX_DEPTH_EXCEEDED]";
  }

  // Handle primitives
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return redactPIIFromString(obj);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, depth + 1, maxDepth));
  }

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: redactPIIFromString(obj.message),
      stack: redactPIIFromString(obj.stack || ""),
    };
  }

  // Handle objects
  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive fields entirely
      if (SENSITIVE_FIELDS.has(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogging(value, depth + 1, maxDepth);
    }

    return sanitized;
  }

  // Fallback for other types (functions, symbols, etc.)
  return String(obj);
}

/**
 * Properly serialize unknown errors for JSON logging
 */
export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
    if (error.cause) {
      serialized.cause = String(error.cause);
    }
    return serialized;
  }

  if (error && typeof error === "object") {
    return Object.entries(error).reduce(
      (acc, [key, value]) => {
        acc[key] = value instanceof Error ? String(value) : value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  return { error: String(error) };
};

const env = process.env.NODE_ENV || "development";
const logLevel = process.env.LOG_LEVEL || "info";
const isProd = env === "production";
const isEdge = process.env.NEXT_RUNTIME === "edge";
const shouldMirrorConsole = !isProd;

// Disable pino-pretty in development to avoid worker thread errors
// Use simple JSON logging instead for better stability
const transport: LoggerOptions["transport"] = undefined;

const baseLogger = pino({
  level: logLevel,
  transport: isEdge ? undefined : transport,
  base: {
    env,
  },
});

type LoggerWithLog = typeof baseLogger & { log: typeof baseLogger.info };

const mirrorToConsole = (
  consoleMethod: (...args: unknown[]) => void,
  pinoMethod: (...args: unknown[]) => void,
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
            const enumerableProps = Object.keys(err).reduce(
              (acc, key) => {
                acc[key] = (err as Record<string, unknown>)[key];
                return acc;
              },
              {} as Record<string, unknown>,
            );

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

// Wrap logger methods with PII sanitization
const sanitizeLogArgs = (...args: unknown[]): unknown[] => {
  return args.map((arg) => sanitizeForLogging(arg));
};

logger.log = (...args: unknown[]) => {
  const sanitized = sanitizeLogArgs(...args);
  mirrorToConsole(console.log, boundInfo)(...sanitized);
};

logger.info = (...args: unknown[]) => {
  const sanitized = sanitizeLogArgs(...args);
  mirrorToConsole(console.info, boundInfo)(...sanitized);
};

logger.warn = (...args: unknown[]) => {
  const sanitized = sanitizeLogArgs(...args);
  mirrorToConsole(console.warn, boundWarn)(...sanitized);
};

logger.error = (...args: unknown[]) => {
  const sanitized = sanitizeLogArgs(...args);
  mirrorToConsole(console.error, boundError)(...sanitized);
};

export const logError = (error: unknown, context?: string) => {
  const sanitizedError = sanitizeForLogging(serializeError(error));
  const errorObj =
    typeof sanitizedError === "object" && sanitizedError !== null
      ? sanitizedError
      : { err: sanitizedError };
  logger.error({ ...errorObj, context }, "Error occurred");
};

export { logger };
export default logger;
