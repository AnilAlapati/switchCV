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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-html-link-for-pages": "warn",
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
    ],
  },
];

export default eslintConfig;
