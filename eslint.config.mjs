import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Shared lint rules for the Next/React TypeScript app.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep generated build files out of lint runs.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "convex/_generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
