import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "max-lines": [
        "warn",
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      // Disabled: Legacy codebase uses 'any' for Firestore dynamic data
      // TODO: Gradually add proper types in future refactoring
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      // Strict enforcement of hook dependencies prevents bugs
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-html-link-for-pages": "warn",
      // Enforce structured logging - no console in production code
      "no-console": "error",
    },
  },
  {
    // CLI scripts legitimately use console.log and require()
    files: ["**/*.cjs", "scripts/**/*.js", "scripts/**/*.cjs", "public/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.property.name='verifyIdToken']",
          message:
            "Direct use of verifyIdToken is discouraged in API routes. Use getAuthenticatedUserId from @/lib/utils/api-helpers instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='NextResponse'][callee.property.name='json'] ObjectExpression Property[key.name='error']",
          message:
            "Consider using handleApiError from @/lib/utils/api-helpers for consistent error handling.",
        },
      ],
    },
  },
  {
    // Logger file must use console - it's the wrapper
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test.js",
      "**/*.test.jsx",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/__tests__/**/*.js",
      "**/__tests__/**/*.jsx",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "max-lines": "off",
      // Allow 'any' types in test files for mocking flexibility
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars in tests (common for mocks and setup)
      "@typescript-eslint/no-unused-vars": "off",
      // Allow require() in tests (needed for jest.mock patterns)
      "@typescript-eslint/no-require-imports": "off",
      // Allow flexible error handling patterns in tests
      "no-restricted-syntax": "off",
      // Allow console in tests for debugging
      "no-console": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "test-*.js",
      "list-gemini-models.js",
      "functions/**",
      "coverage/**",
      ".firebase/**",
    ],
  },
];

export default eslintConfig;
