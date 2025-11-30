import { logger } from "@/lib/logger";

type Severity = "info" | "warning" | "error";

const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

interface ErrorContext {
  source: string;
  severity?: Severity;
  meta?: Record<string, unknown>;
}

interface NormalizedError {
  message: string;
  stack?: string;
  code?: string;
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as { code?: string }).code,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  // Handle objects (including empty objects {})
  if (error && typeof error === "object") {
    const errorObj = error as {
      message?: string;
      code?: string;
      stack?: string;
    };
    if (errorObj.message) {
      return {
        message: errorObj.message,
        code: errorObj.code,
        stack: errorObj.stack,
      };
    }
    // Empty object or object without message
    return { message: "Unknown error (no error details provided)" };
  }

  return { message: "Unknown error" };
}

function redact(message: string): string {
  return message.replace(EMAIL_REGEX, "[redacted-email]");
}

export function getSanitizedMessage(error: unknown, fallback: string): string {
  const normalized = normalizeError(error);
  if (!normalized.message) {
    return fallback;
  }
  const sanitized = redact(normalized.message).trim();
  return sanitized.length > 0 ? sanitized : fallback;
}

export function reportError(error: unknown, context: ErrorContext): void {
  const normalized = normalizeError(error);
  const payload = {
    severity: context.severity || "error",
    source: context.source,
    message: redact(normalized.message),
    code: normalized.code,
    ...context.meta,
  };

  if (typeof window !== "undefined") {
    logger.error(payload);
  } else {
    logger.error(payload);
  }

  const sentry = (
    globalThis as unknown as {
      Sentry?: {
        captureException: (
          err: unknown,
          meta?: Record<string, unknown>
        ) => void;
      };
    }
  ).Sentry;
  if (sentry?.captureException) {
    sentry.captureException(error, { tags: { source: context.source } });
  }
}
