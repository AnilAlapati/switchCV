/**
 * External API mocks for testing
 * Provides mock implementations for OpenAI, Groq, Gemini, HuggingFace APIs
 */

import { jest } from '@jest/globals';

// Mock OpenAI API response
export const mockOpenAIResponse = {
  id: 'chatcmpl-test',
  choices: [
    {
      message: {
        content: 'Test response from OpenAI',
      },
      index: 0,
    },
  ],
};

// Mock Groq API response
export const mockGroqResponse = {
  choices: [
    {
      message: {
        content: 'Test response from Groq',
      },
      index: 0,
    },
  ],
};

// Mock Gemini API response
export const mockGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [{ text: 'Test response from Gemini' }],
      },
    },
  ],
};

// Mock HuggingFace API response
export const mockHuggingFaceResponse = [
  {
    generated_text: 'Test response from HuggingFace',
  },
];

// Mock Gemini models response
export const mockGeminiModelsResponse = {
  models: [
    {
      name: 'models/gemini-1.5-pro',
      supportedGenerationMethods: ['generateContent'],
    },
    {
      name: 'models/gemini-1.5-flash',
      supportedGenerationMethods: ['generateContent'],
    },
  ],
};

// Helper to set up global fetch mock for API calls
export function setupFetchMock(responses: Record<string, any>) {
  (global.fetch as any) = jest.fn().mockImplementation((url: string, options?: any) => {
    // Find matching response based on URL and method
    for (const [key, response] of Object.entries(responses)) {
      if (url.includes(key)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(response),
          text: jest.fn().mockResolvedValue(JSON.stringify(response)),
        } as any);
      }
    }

    // Default: return mock response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue('{}'),
    } as any);
  });
}

// Helper to set up fetch to fail
export function setupFetchMockError(url: string, error: Error) {
  const originalFetch = global.fetch as any;
  (global.fetch as any) = jest.fn().mockImplementation((fetchUrl: string) => {
    if (fetchUrl.includes(url)) {
      return Promise.reject(error);
    }
    return originalFetch(fetchUrl);
  });
}

// Helper to set up fetch to return error status
export function setupFetchMockFailure(url: string, status: number, message?: string) {
  const originalFetch = global.fetch as any;
  (global.fetch as any) = jest.fn().mockImplementation((fetchUrl: string) => {
    if (fetchUrl.includes(url)) {
      return Promise.resolve({
        ok: false,
        status,
        json: jest.fn().mockResolvedValue({ error: message || 'Error' }),
        text: jest.fn().mockResolvedValue(message || 'Error'),
      } as any);
    }
    return originalFetch(fetchUrl);
  });
}

// Reset fetch mock
export function resetFetchMock() {
  (global.fetch as any).mockReset();
}
