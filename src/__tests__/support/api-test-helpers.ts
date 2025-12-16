/**
 * API Test Helpers and Utilities
 *
 * Provides mock request/response creation and Firebase mocking utilities
 * for testing Next.js API routes.
 *
 * @module __tests__/support/api-test-helpers
 */

import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing
 * @param url - URL for the request
 * @param options - Request options
 * @returns Mocked NextRequest
 */
export function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    token?: string;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return new NextRequest(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Get response body as JSON
 * @param response - Response object
 * @returns Parsed JSON
 */
export async function getResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * Get response body as text
 * @param response - Response object
 * @returns Response text
 */
export async function getResponseText(response: Response): Promise<string> {
  return response.text();
}

/**
 * Create an authenticated mock request
 * @param url - URL for the request
 * @param token - Bearer token
 * @param method - HTTP method
 * @param body - Request body
 * @returns Mocked authenticated NextRequest
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  return createMockRequest(url, { method, body, token });
}

/**
 * Create an authenticated request as specific user
 * @param url - URL for the request
 * @param userId - User ID
 * @param method - HTTP method
 * @param body - Request body
 * @returns Mocked authenticated NextRequest (token is `valid-token`)
 */
export function createUserRequest(
  url: string,
  userId: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  return createMockRequest(url, {
    method,
    body,
    headers: {
      'X-User-ID': userId,
      'Authorization': 'Bearer valid-token',
    },
  });
}

/**
 * Create an unauthenticated request
 * @param url - URL for the request
 * @param method - HTTP method
 * @param body - Request body
 * @returns Mocked unauthenticated NextRequest
 */
export function createUnauthenticatedRequest(
  url: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  return createMockRequest(url, { method, body });
}

/**
 * Assert response has specific status
 * @param response - Response object
 * @param expectedStatus - Expected status code
 * @param message - Error message
 */
export function expectStatus(
  response: Response,
  expectedStatus: number,
  message?: string
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      message ||
        `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

/**
 * Assert response JSON has error field
 * @param data - Parsed response data
 * @param message - Error message
 */
export function expectErrorResponse(data: unknown, message?: string): void {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('error' in data)
  ) {
    throw new Error(
      message || 'Expected response to have error field'
    );
  }
}

/**
 * Mock Firebase Admin Auth
 * @returns Mocked admin auth
 */
export function mockFirebaseAdminAuth() {
  return {
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { uid: 'test-user-id' };
      }
      if (token === 'other-user-token') {
        return { uid: 'other-user-id' };
      }
      throw new Error('Invalid token');
    }),
  };
}

/**
 * Mock Firebase Admin Firestore
 * @returns Mocked admin firestore
 */
export function mockFirebaseAdminFirestore() {
  return {
    collection: jest.fn((name: string) => ({
      doc: jest.fn((id: string) => ({
        get: jest.fn(async () => ({
          exists: id !== 'nonexistent',
          data: () => ({
            id,
            userId: 'test-user-id',
          }),
        })),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        batch: jest.fn(),
      })),
      add: jest.fn(async () => ({ id: 'new-doc-id' })),
      where: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: [],
        })),
      })),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  };
}

/**
 * Mock rate limit check
 * @param allowed - Whether to allow
 * @returns Mocked rate limit result
 */
export function mockRateLimitCheck(allowed: boolean = true) {
  return {
    allowed,
    limit: 30,
    remaining: allowed ? 29 : 0,
    resetIn: 60000,
  };
}

/**
 * Setup common mocks for API testing
 * @returns Cleanup function
 */
export function setupApiMocks() {
  // Mock Firebase Admin
  jest.mock('@/lib/firebase-admin', () => ({
    adminAuth: mockFirebaseAdminAuth(),
    adminDb: mockFirebaseAdminFirestore(),
  }));

  // Return cleanup function
  return () => {
    jest.unmock('@/lib/firebase-admin');
  };
}

/**
 * Create a batch of authenticated requests
 * @param url - Base URL
 * @param count - Number of requests
 * @param method - HTTP method
 * @param bodyGenerator - Function to generate body for each request
 * @returns Array of requests
 */
export function createBatchRequests(
  url: string,
  count: number,
  method: string = 'POST',
  bodyGenerator: (i: number) => unknown = (i) => ({ id: i })
): NextRequest[] {
  return Array.from({ length: count }).map((_, i) =>
    createAuthenticatedRequest(
      url,
      'valid-token',
      method,
      bodyGenerator(i)
    )
  );
}
