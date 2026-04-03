import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import path from "path";
import reactHooks from "eslint-plugin-react-hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
      // Gradually enforcing type safety - warn on 'any' usage
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      // Strict enforcement of hook dependencies prevents bugs
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-html-link-for-pages": "warn",
      // Enforce structured logging - no console in production code
      "no-console": "error",
      // PERF: Prevent window.alert in production code — use toast/sonner instead
      "no-restricted-globals": [
        "error",
        {
          "name": "alert",
          "message": "❌ Do not use window.alert(). Use toast notifications (sonner) instead for accessibility and UX."
        }
      ],
    },
  },
  {
    // SWR hooks: Block revalidateOnFocus: true which causes unnecessary Firestore reads
    files: ["src/hooks/**/*.ts", "src/hooks/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='revalidateOnFocus'][value.value=true]",
          message: "❌ revalidateOnFocus: true causes unnecessary Firestore reads on every tab switch. Use false instead or omit (global default is false)."
        },
      ],
    },
  },
  {
    // CLI scripts legitimately use console.log and require()
    files: ["**/*.cjs", "scripts/**/*.js", "scripts/**/*.cjs", "scripts/**/*.ts", "public/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='verifyIdToken']",
          message:
            "❌ Direct use of verifyIdToken is FORBIDDEN in API routes. Use getAuthenticatedUserId from @/lib/utils/api-helpers instead.",
        },
        {
          selector:
            "MemberExpression[object.name='error'][property.name='message']",
          message:
            "⚠️ Do not access error.message in API routes. Use handleApiError() to prevent leaking internal error details to clients.",
        },
        {
          selector:
            "MemberExpression[object.name='error'][property.name='stack']",
          message:
            "❌ NEVER expose error.stack in API responses. Use handleApiError() for safe error handling.",
        },
        {
          selector:
            "MemberExpression[object.name='err'][property.name='message']",
          message:
            "⚠️ Do not access err.message in API routes. Use handleApiError() to prevent leaking internal error details to clients.",
        },
        {
          selector: "CallExpression[callee.name='handleApiError'] TemplateLiteral",
          message:
            "❌ Do not interpolate variables into handleApiError() messages. The message is sent to the client. Use a static string: handleApiError(err, 'Operation failed')",
        },
      ],
      // API routes frequently handle Firestore errors and dynamic data
      "@typescript-eslint/no-explicit-any": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/firebase-admin",
              message: "Direct DB access is forbidden in API routes. Move logic to a Service in src/lib/services/.",
            },
            {
              name: "firebase-admin",
              message: "Direct DB access is forbidden in API routes. Move logic to a Service in src/lib/services/.",
            },
            {
              name: "@/lib/firebase",
              message: "Direct DB access is forbidden in API routes. Move logic to a Service in src/lib/services/.",
            },
          ],
        },
      ],
    },
  },
  {
    // User approval endpoints use public token-based auth, not services
    files: ["src/app/api/user-approval/**/route.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // DAL client.ts is the ONLY file allowed to import firebase-admin directly
    // All other files must import from @/lib/dal instead
    files: ["src/lib/dal/client.ts"],
    rules: {
      "no-restricted-imports": "off",
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
    // AI service files are complex integrations that benefit from being in one file
    files: ["src/lib/services/ai*.ts"],
    rules: {
      "max-lines": ["warn", { max: 600, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Files that handle dynamic Firestore data structures legitimately need 'any'
    files: [
      "src/lib/utils/resumeEditor.ts",
      "src/lib/utils/resumeVisibility.ts",
      "src/lib/resumeEnhancer.ts",
      "src/lib/resumeMigration.ts",
      "src/lib/notificationService.ts",
      "src/lib/notifications/**/*.ts",
      "src/lib/recruiterPipeline*.ts",
      "src/lib/searchUtils.ts",
      "src/lib/resumeDeleter.ts",
      "src/lib/services/analyticsService.ts",
      "src/components/resume/LegacyResumeRenderer.tsx",
      "src/components/resume/renderTemplateField.tsx",
      "src/components/resume/templateRendererUtils.ts",
      "src/components/resume/ResumePageLayout.tsx",
      "src/components/dashboard/**/*.tsx",
      "src/components/create-resume/**/*.tsx",
      "src/components/recruiter/**/*.tsx",
      "src/components/settings/**/*.tsx",
      "src/hooks/useAnalyticsTracking.ts",
      "src/hooks/useAuditLog.ts",
      "src/hooks/useDashboardMetrics.ts",
      "src/hooks/useRecruiterPipeline.ts",
      "src/hooks/useResume.tsx",
      "src/hooks/useResumeDelete.ts",
      "src/hooks/useUserProfile.ts",
      "src/app/api/profiles/search/search-query.ts",
      "src/app/api/profiles/search/search-utils.ts",
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
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
      reportUnusedDisableDirectives: "error",
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
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
