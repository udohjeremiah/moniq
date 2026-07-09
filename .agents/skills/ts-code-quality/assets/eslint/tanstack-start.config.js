import { globalIgnores } from "eslint/config";

const config = [
  {
    files: ["**/vite.config.*"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
  globalIgnores([
    "**/routeTree.gen.ts",
    ".netlify/**",
    ".output/**",
    ".tanstack/**",
    ".vinxi/**",
    "dist-ssr/**",
  ]),
];

export default config;
