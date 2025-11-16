/**
 * Test Utilities and Helpers
 * Provides common setup for component testing including providers, mocks, and custom render
 */

import React, { ReactElement } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";

/**
 * All required providers for components that depend on Next.js, Firebase, or Auth
 */
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

/**
 * Custom render function that includes all providers
 * Usage: const { getByText } = render(<MyComponent />);
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

/**
 * Mock data factories for common test objects
 */
export const mockFactories = {
  /**
   * Create a mock user object
   */
  user: (overrides = {}) => ({
    uid: "test-user-id",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: null,
    ...overrides,
  }),

  /**
   * Create a mock profile object for resume
   */
  profile: (overrides = {}) => ({
    id: "test-profile-id",
    userId: "test-user-id",
    title: "Test Resume",
    summary: "Test summary",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    contact: {
      email: "test@example.com",
      phone: "",
      location: "",
      website: "",
    },
    isPublic: false,
    slug: "test-resume",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Create a mock search result profile
   */
  searchResult: (overrides = {}) => ({
    userId: "result-user-id",
    username: "testuser",
    displayName: "Test User",
    bio: "A test user",
    role: "Software Engineer",
    location: "San Francisco, CA",
    skills: ["React", "TypeScript"],
    hasApproval: false,
    ...overrides,
  }),

  /**
   * Create a mock access request
   */
  accessRequest: (overrides = {}) => ({
    id: "request-id",
    fromUserId: "requester-id",
    fromUserEmail: "requester@example.com",
    toUserId: "owner-id",
    resumeId: "profile-id",
    status: "pending",
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  }),

  /**
   * Create a mock analytics event
   */
  analyticsEvent: (overrides = {}) => ({
    id: "event-id",
    userId: "user-id",
    resumeId: "profile-id",
    eventType: "view",
    metadata: {},
    createdAt: new Date(),
    ...overrides,
  }),

  /**
   * Create a mock AI generation response
   */
  aiResponse: (overrides = {}) => ({
    success: true,
    content: "Generated content from AI",
    tokens: {
      prompt: 100,
      completion: 200,
      total: 300,
    },
    duration: 1500,
    ...overrides,
  }),
};

/**
 * Common mock implementations
 */
export const mockImplementations = {
  /**
   * Mock router object with all common methods
   */
  router: (overrides = {}) => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/",
    query: {},
    ...overrides,
  }),

  /**
   * Mock useAuth hook return value
   */
  useAuth: (overrides = {}) => ({
    user: mockFactories.user(),
    loading: false,
    error: null,
    ...overrides,
  }),

  /**
   * Mock useProfileSearch hook return value
   */
  useProfileSearch: (overrides = {}) => ({
    results: [],
    searching: false,
    error: null,
    totalResults: 0,
    performSearch: jest.fn(),
    ...overrides,
  }),

  /**
   * Mock useAnalyticsTracking hook return value
   */
  useAnalyticsTracking: (overrides = {}) => ({
    sessionStartTime: Date.now(),
    ...overrides,
  }),

  /**
   * Mock useTrackAnalytics hook return value
   */
  useTrackAnalytics: (overrides = {}) => ({
    track: jest.fn(),
    ...overrides,
  }),
};

/**
 * Wait for async operations in tests
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";

// Re-export common testing utilities
export { default as userEvent } from "@testing-library/user-event";
