import type { AIFailureCode } from "./types";

interface AIFailureClassificationInput {
  error?: unknown;
  errorMessage?: string;
  httpStatus?: number;
  emptyResponse?: boolean;
  invalidJson?: boolean;
  schemaValidationFailed?: boolean;
  schemaErrorCount?: number;
  circuitOpen?: boolean;
  allModelsFailed?: boolean;
  providerNotConfigured?: boolean;
}

interface AIFailureClassification {
  failureCode: AIFailureCode;
  errorMessage: string;
  httpStatus?: number;
  failureSubcode?: string;
  providerErrorClass?: string;
  schemaErrorCount?: number;
}

function parseHttpStatus(errorMessage: string): number | undefined {
  const patterns = [
    /\((\d{3})\)/,
    /status(?: code)?[:\s]+(\d{3})/i,
    /returned\s+(\d{3})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(errorMessage);
    const rawStatus = match?.[1];
    if (!rawStatus) {
      continue;
    }

    const parsed = Number.parseInt(rawStatus, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getProviderErrorClass(errorMessage: string): string | undefined {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("api key")) {
    return "api_key";
  }
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "timeout";
  }
  if (lowerMessage.includes("circuit")) {
    return "circuit_breaker";
  }
  if (lowerMessage.includes("json")) {
    return "invalid_json";
  }
  if (lowerMessage.includes("schema")) {
    return "schema_validation";
  }
  if (lowerMessage.includes("context") || lowerMessage.includes("token")) {
    return "context_window";
  }

  return undefined;
}

function buildClassificationMessage(
  input: AIFailureClassificationInput,
): string {
  if (typeof input.errorMessage === "string" && input.errorMessage.trim()) {
    return input.errorMessage.trim();
  }

  if (input.error instanceof Error && input.error.message.trim()) {
    return input.error.message.trim();
  }

  if (typeof input.error === "string" && input.error.trim()) {
    return input.error.trim();
  }

  return "Unknown AI error";
}

export function classifyAIFailure(
  input: AIFailureClassificationInput,
): AIFailureClassification {
  const errorMessage = buildClassificationMessage(input);
  const httpStatus = input.httpStatus ?? parseHttpStatus(errorMessage);
  const lowerMessage = errorMessage.toLowerCase();
  const providerErrorClass = getProviderErrorClass(errorMessage);

  if (input.emptyResponse) {
    return {
      failureCode: "AI_EMPTY_RESPONSE",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (input.invalidJson) {
    return {
      failureCode: "AI_NON_JSON_RESPONSE",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (input.schemaValidationFailed) {
    return {
      failureCode: "AI_SCHEMA_VALIDATION_FAILED",
      errorMessage,
      httpStatus,
      providerErrorClass,
      schemaErrorCount: input.schemaErrorCount,
    };
  }

  if (input.circuitOpen) {
    return {
      failureCode: "AI_CIRCUIT_OPEN",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (input.providerNotConfigured) {
    return {
      failureCode: "AI_PROVIDER_NOT_CONFIGURED",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (input.allModelsFailed || lowerMessage.includes("all ai providers failed")) {
    return {
      failureCode: "AI_ALL_MODELS_FAILED",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (
    lowerMessage.includes("api key not configured") ||
    lowerMessage.includes("required environment variable") ||
    lowerMessage.includes("secret")
  ) {
    return {
      failureCode: "AI_SECRET_MISSING",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (lowerMessage.includes("not configured")) {
    return {
      failureCode: "AI_PROVIDER_NOT_CONFIGURED",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("aborterror")
  ) {
    return {
      failureCode: "AI_TIMEOUT",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (
    lowerMessage.includes("context") ||
    lowerMessage.includes("maximum context length") ||
    lowerMessage.includes("prompt is too long") ||
    lowerMessage.includes("token limit")
  ) {
    return {
      failureCode: "AI_CONTEXT_TOO_LARGE",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (httpStatus !== undefined && httpStatus >= 500) {
    return {
      failureCode: "AI_PROVIDER_5XX",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  if (httpStatus !== undefined && httpStatus >= 400) {
    return {
      failureCode: "AI_PROVIDER_4XX",
      errorMessage,
      httpStatus,
      providerErrorClass,
    };
  }

  return {
    failureCode: "AI_UNKNOWN_ERROR",
    errorMessage,
    httpStatus,
    providerErrorClass,
  };
}
