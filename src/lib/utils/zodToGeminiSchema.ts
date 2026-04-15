/**
 * Zod-to-Gemini JSON Schema Converter (Zod v4)
 *
 * Converts a Zod schema to Gemini's JSON Schema format for use with
 * `responseMimeType: "application/json"` + `responseSchema` in generationConfig.
 *
 * Gemini uses a subset of JSON Schema (OpenAPI 3.0 style). Key differences:
 *   - `type` must be uppercase: "STRING", "NUMBER", "INTEGER", "BOOLEAN", "ARRAY", "OBJECT"
 *   - No `$ref`, `allOf`, `anyOf`, `oneOf` support
 *   - `enum` values must be strings
 *   - `required` is an array of property names on the object type
 *
 * Uses `_def.type` (lowercase string) for type identification instead of
 * `instanceof` to avoid module boundary issues in Jest ESM/CJS environments.
 *
 * @module utils/zodToGeminiSchema
 */

import type { ZodTypeAny } from "zod";

export interface GeminiJsonSchema {
  type: string;
  description?: string;
  properties?: Record<string, GeminiJsonSchema>;
  required?: string[];
  items?: GeminiJsonSchema;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
  nullable?: boolean;
}

/** Internal Zod v4 _def shape */
interface ZodDef {
  type: string;
  checks?: ZodCheck[];
  innerType?: ZodTypeAny;
  shape?: Record<string, ZodTypeAny>;
  element?: ZodTypeAny;
  entries?: Record<string, string>;
  values?: string[] | Record<string, string | number>;
  options?: ZodTypeAny[];
  schema?: ZodTypeAny;
  defaultValue?: unknown;
}

/** Zod v4 check object with _zod.def */
interface ZodCheck {
  _zod?: {
    def: {
      check: string;
      minimum?: number;
      maximum?: number;
      value?: number;
      inclusive?: boolean;
      length?: number;
      format?: string;
    };
  };
  _def?: {
    type: string;
    format?: string;
    check?: string;
  };
  constructor: { name: string };
}

/**
 * Get the Zod v4 type from _def.type (lowercase string).
 * Falls back to constructor.name for edge cases.
 */
function getDefType(schema: ZodTypeAny): string {
  const def = schema._def as ZodDef;
  return def?.type ?? "";
}

/**
 * Extract check constraints from Zod v4 _def.checks array.
 * In v4, checks store data in `_zod.def` or are full schema objects with `_def`.
 */
function extractStringChecks(checks: ZodCheck[]): {
  minLength?: number;
  maxLength?: number;
  format?: string;
} {
  const result: { minLength?: number; maxLength?: number; format?: string } =
    {};

  for (const check of checks) {
    // Zod v4 check objects: _zod.def.check identifies the check type
    const zodDef = check._zod?.def;
    if (zodDef) {
      if (zodDef.check === "min_length" && zodDef.minimum !== undefined) {
        result.minLength = zodDef.minimum;
      }
      if (zodDef.check === "max_length" && zodDef.maximum !== undefined) {
        result.maxLength = zodDef.maximum;
      }
    }

    // Email/URL checks are full schema objects in v4 (e.g. ZodEmail)
    const checkDef = check._def as
      | { type?: string; format?: string }
      | undefined;
    if (checkDef?.format === "email") {
      result.format = "email";
    }
    if (checkDef?.format === "url" || checkDef?.format === "uri") {
      result.format = "uri";
    }
  }

  return result;
}

/**
 * Extract number constraints from Zod v4 checks.
 */
function extractNumberChecks(checks: ZodCheck[]): {
  minimum?: number;
  maximum?: number;
  isInt: boolean;
} {
  const result: { minimum?: number; maximum?: number; isInt: boolean } = {
    isInt: false,
  };

  for (const check of checks) {
    const zodDef = check._zod?.def;
    if (zodDef) {
      if (zodDef.check === "greater_than" && zodDef.value !== undefined) {
        result.minimum = zodDef.value;
      }
      if (zodDef.check === "less_than" && zodDef.value !== undefined) {
        result.maximum = zodDef.value;
      }
    }

    // Int check is a ZodNumberFormat with _def.format = "safeint"
    const checkDef = check._def as { format?: string } | undefined;
    if (checkDef?.format === "safeint" || checkDef?.format === "int32") {
      result.isInt = true;
    }
  }

  return result;
}

/**
 * Extract array length constraints from Zod v4 checks.
 */
function extractArrayChecks(checks: ZodCheck[]): {
  minItems?: number;
  maxItems?: number;
} {
  const result: { minItems?: number; maxItems?: number } = {};

  for (const check of checks) {
    const zodDef = check._zod?.def;
    if (zodDef) {
      if (zodDef.check === "min_length" && zodDef.minimum !== undefined) {
        result.minItems = zodDef.minimum;
      }
      if (zodDef.check === "max_length" && zodDef.maximum !== undefined) {
        result.maxItems = zodDef.maximum;
      }
    }
  }

  return result;
}

/**
 * Convert a Zod schema to a Gemini-compatible JSON Schema object.
 *
 * @param schema - Any Zod schema
 * @returns GeminiJsonSchema for use in generationConfig.responseSchema
 */
export function zodToGeminiSchema(schema: ZodTypeAny): GeminiJsonSchema {
  return convertZodType(schema);
}

function convertZodType(schema: ZodTypeAny): GeminiJsonSchema {
  const def = schema._def as ZodDef;
  const defType = getDefType(schema);

  // Unwrap optional
  if (defType === "optional") {
    const inner = convertZodType(def.innerType as ZodTypeAny);
    inner.nullable = true;
    return inner;
  }

  // Unwrap nullable
  if (defType === "nullable") {
    const inner = convertZodType(def.innerType as ZodTypeAny);
    inner.nullable = true;
    return inner;
  }

  // Unwrap default
  if (defType === "default") {
    return convertZodType(def.innerType as ZodTypeAny);
  }

  // String
  // NOTE: Gemini structured output does not support format, minLength, or maxLength
  // on STRING types. Including them causes HTTP 400 errors from the Gemini API.
  if (defType === "string") {
    const result: GeminiJsonSchema = { type: "STRING" };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Number
  if (defType === "number") {
    let result: GeminiJsonSchema = { type: "NUMBER" };
    if (def.checks && def.checks.length > 0) {
      const constraints = extractNumberChecks(def.checks);
      if (constraints.isInt) result = { ...result, type: "INTEGER" };
    }
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Boolean
  if (defType === "boolean") {
    return { type: "BOOLEAN" };
  }

  // Enum — Zod v4 uses _def.entries (Record<string, string>)
  if (defType === "enum") {
    const entries = def.entries as Record<string, string> | undefined;
    if (entries) {
      return {
        type: "STRING",
        enum: Object.values(entries),
      };
    }
    // Fallback for legacy _def.values
    const values = def.values;
    if (Array.isArray(values)) {
      return { type: "STRING", enum: values };
    }
    return { type: "STRING" };
  }

  // Array — Zod v4 uses _def.element (not _def.type)
  if (defType === "array") {
    const elementSchema = def.element as ZodTypeAny;
    const result: GeminiJsonSchema = {
      type: "ARRAY",
      items: convertZodType(elementSchema),
    };
    if (def.checks && def.checks.length > 0) {
      const constraints = extractArrayChecks(def.checks);
      if (constraints.minItems !== undefined)
        result.minItems = constraints.minItems;
      if (constraints.maxItems !== undefined)
        result.maxItems = constraints.maxItems;
    }
    return result;
  }

  // Object — Zod v4: _def.shape is a plain object, not a function
  if (defType === "object") {
    const shape = def.shape as Record<string, ZodTypeAny>;
    const properties: Record<string, GeminiJsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodType(value as ZodTypeAny);

      // Track required fields (not optional, not nullable)
      const fieldType = getDefType(value as ZodTypeAny);
      if (fieldType !== "optional" && fieldType !== "nullable") {
        required.push(key);
      }
    }

    const result: GeminiJsonSchema = {
      type: "OBJECT",
      properties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    return result;
  }

  // Literal — Zod v4: _def.values is an array
  if (defType === "literal") {
    const values = def.values as unknown[] | undefined;
    const val = values?.[0];
    if (typeof val === "string") {
      return { type: "STRING", enum: [val] };
    }
    if (typeof val === "number") {
      return { type: "NUMBER" };
    }
    if (typeof val === "boolean") {
      return { type: "BOOLEAN" };
    }
    return { type: "STRING" };
  }

  // Union — _def.options exists in v4
  if (defType === "union") {
    const options = def.options as ZodTypeAny[];
    const allStringLiterals = options.every((opt) => {
      const optDef = opt._def as ZodDef;
      if (optDef.type === "literal") {
        const vals = optDef.values as unknown[] | undefined;
        return typeof vals?.[0] === "string";
      }
      return false;
    });

    if (allStringLiterals) {
      return {
        type: "STRING",
        enum: options.map((opt) => {
          const optDef = opt._def as ZodDef;
          return (optDef.values as string[])[0];
        }),
      };
    }

    // Fallback: convert the first option
    return convertZodType(options[0]);
  }

  // Record — generic object
  if (defType === "record") {
    return { type: "OBJECT" };
  }

  // Fallback: generic string
  return { type: "STRING" };
}
