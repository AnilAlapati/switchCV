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
      // Enable as warning to catch new any usages while allowing existing ones
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "warn",
      // Enable exhaustive-deps as warning to improve hook dependency tracking
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    files: ["**/*.cjs", "scripts/**/*.js", "scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
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
