const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [path.resolve(__dirname, 'jest.setup.js')],
  moduleNameMapper: {
    '^@/(.*)$': path.resolve(__dirname, 'src/$1'),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    'server-only': path.resolve(__dirname, 'src/__tests__/support/mocks/server-only.ts'),
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/vibe-concepts/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/__support__/',
    '<rootDir>/node_modules/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/app/vibe-concepts/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/jest-preprocessor.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@noble|uuid|next-intl|use-intl)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
