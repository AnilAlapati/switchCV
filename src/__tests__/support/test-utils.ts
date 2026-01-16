/**
 * Common test utilities and helpers
 * Provides reusable functions for setting up tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { jest } from '@jest/globals';

/**
 * Custom render function that includes common providers
 * Can be extended with themes, contexts, etc.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add common wrapper logic here if needed
  return render(ui, options);
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock console methods to reduce noise in test output
 */
export function silenceConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  });
}

/**
 * Create a mock file for testing file uploads
 */
export function createMockFile(
  content: string = 'test content',
  filename: string = 'test.txt',
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

/**
 * Mock AbortController (for timeout testing)
 */
export function mockAbortController() {
  const originalAbortController = global.AbortController;

  beforeEach(() => {
    global.AbortController = jest.fn().mockImplementation(() => ({
      signal: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        aborted: false,
      },
      abort: jest.fn(),
    })) as any;
  });

  afterEach(() => {
    global.AbortController = originalAbortController;
  });
}

/**
 * Helper to create a promise that can be resolved externally
 */
export function createDeferredPromise<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve: (value: T) => void;
  let reject: (reason: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

/**
 * Generate mock user data for testing
 */
export function createMockUser(overrides = {}) {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    emailVerified: false,
    displayName: 'Test User',
    photoURL: null,
    isAnonymous: false,
    metadata: {
      createdAt: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: 'test-refresh-token',
    ...overrides,
  };
}

/**
 * Generate mock resume data for testing
 */
export function createMockResume(overrides = {}) {
  return {
    id: 'test-resume-id',
    userId: 'test-user-id',
    title: 'Test Resume',
    template: 'modern',
    contact: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York, NY',
    },
    summary: 'Test summary',
    experience: [],
    education: [],
    skills: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    ...overrides,
  };
}

/**
 * Generate mock job seeker metrics
 */
export function createMockJobSeekerMetrics(overrides = {}) {
  return {
    resumeCount: 3,
    profileViews: 42,
    accessRequests: 5,
    acceptedRequests: 2,
    rejectedRequests: 1,
    averageViewsPerDay: 2.1,
    ...overrides,
  };
}

/**
 * Generate mock recruiter metrics
 */
export function createMockRecruiterMetrics(overrides = {}) {
  return {
    candidateCount: 150,
    activeSearches: 8,
    accessRequestsSent: 25,
    acceptedByJobSeekers: 18,
    rejectedByJobSeekers: 3,
    pendingRequests: 4,
    ...overrides,
  };
}
