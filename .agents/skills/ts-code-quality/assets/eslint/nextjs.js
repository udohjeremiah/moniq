import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "**/page.tsx",
      "**/layout.tsx",
      "**/not-found.tsx",
      "**/error.tsx",
      "**/loading.tsx",
      "next.config.*",
      "eslint.config.*",
    ],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
];

export default config;
