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
  (global.fetch as jest.Mock) = (jest.fn() as jest.Mock).mockImplementation((...args: unknown[]) => {
    const [url] = args;
    const normalizedUrl = String(url);
    // Find matching response based on URL and method
    for (const [key, response] of Object.entries(responses)) {
      if (normalizedUrl.includes(key)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: (jest.fn() as any).mockResolvedValue(response as any),
          text: (jest.fn() as any).mockResolvedValue(JSON.stringify(response) as any),
        } as any);
      }
    }

    // Default: return mock response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: (jest.fn() as any).mockResolvedValue({} as any),
      text: (jest.fn() as any).mockResolvedValue('{}' as any),
    } as any);
  }) as any;
}

// Helper to set up fetch to fail
export function setupFetchMockError(url: string, error: Error) {
  const originalFetch = global.fetch as any;
  (global.fetch as any) = (jest.fn() as any).mockImplementation((fetchUrl: string) => {
    if (fetchUrl.includes(url)) {
      return Promise.reject(error as any);
    }
    return originalFetch(fetchUrl);
  }) as any;
}

// Helper to set up fetch to return error status
export function setupFetchMockFailure(url: string, status: number, message?: string) {
  const originalFetch = global.fetch as any;
  (global.fetch as any) = (jest.fn() as any).mockImplementation((fetchUrl: string) => {
    if (fetchUrl.includes(url)) {
      return Promise.resolve({
        ok: false,
        status,
        json: (jest.fn() as any).mockResolvedValue({ error: message || 'Error' } as any),
        text: (jest.fn() as any).mockResolvedValue(message || 'Error' as any),
      } as any);
    }
    return originalFetch(fetchUrl);
  }) as any;
}

// Reset fetch mock
export function resetFetchMock() {
  (global.fetch as any).mockReset();
}
