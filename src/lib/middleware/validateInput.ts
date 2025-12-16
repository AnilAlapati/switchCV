/**
 * API Input Validation Middleware
 *
 * Provides standardized input validation for API routes using zod schemas.
 * Ensures all API inputs are validated before processing.
 *
 * @module lib/middleware/validateInput
 * @example
 * ```typescript
 * import { validateInput } from '@/lib/middleware/validateInput';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   title: z.string().min(1),
 *   description: z.string().optional(),
 * });
 *
 * export async function POST(request: NextRequest) {
 *   const { data, error } = await validateInput(request, schema);
 *   if (error) return error;
 *   // data is now validated and typed
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  data: T | null;
  error: NextResponse | null;
  valid: boolean;
}

/**
 * Validate request body against a zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns {Promise<ValidationResult<T>>} Validation result with data or error response
 */
export async function validateInput<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn('Failed to parse request body as JSON');
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid request body. Expected valid JSON.',
            code: 'INVALID_JSON',
          },
          { status: 400 }
        ),
        valid: false,
      };
    }

    // Validate against schema
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      logger.warn('Input validation failed', { errors });

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
          { status: 400 }
        ),
        valid: false,
      };
    }

    return {
      data: result.data,
      error: null,
      valid: true,
    };
  } catch (err) {
    logger.error('Validation middleware error', { error: err });

    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Internal server error during validation',
          code: 'VALIDATION_ERROR',
        },
        { status: 500 }
      ),
      valid: false,
    };
  }
}

/**
 * Validate query parameters against a zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns {Promise<ValidationResult<T>>} Validation result with data or error response
 */
export async function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);

    const result = schema.safeParse(params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      logger.warn('Query validation failed', { errors });

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid query parameters',
            code: 'INVALID_QUERY',
            details: errors,
          },
          { status: 400 }
        ),
        valid: false,
      };
    }

    return {
      data: result.data,
      error: null,
      valid: true,
    };
  } catch (err) {
    logger.error('Query validation error', { error: err });

    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Internal server error during query validation',
          code: 'VALIDATION_ERROR',
        },
        { status: 500 }
      ),
      valid: false,
    };
  }
}

/**
 * Common zod schema patterns for API validation
 */
export const CommonSchemas = {
  /**
   * ID parameter (Firebase document ID or numeric ID)
   */
  id: z.string().min(1, 'ID is required'),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email address'),

  /**
   * Password validation (minimum 8 characters)
   */
  password: z.string().min(8, 'Password must be at least 8 characters'),

  /**
   * User ID (UID from Firebase Auth)
   */
  userId: z.string().min(1, 'User ID is required'),

  /**
   * Search query
   */
  searchQuery: z.string().max(500, 'Search query too long'),

  /**
   * Pagination limit (1-100)
   */
  limit: z.number().int().min(1).max(100).default(20),

  /**
   * Pagination offset
   */
  offset: z.number().int().min(0).default(0),

  /**
   * Sort order
   */
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  /**
   * ISO 8601 date string
   */
  dateString: z.string().datetime('Invalid date format'),

  /**
   * Bearer token for authorization
   */
  bearerToken: z.string().regex(/^Bearer /, 'Invalid authorization header'),

  /**
   * URL
   */
  url: z.string().url('Invalid URL'),

  /**
   * Slug (URL-safe string)
   */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
};
