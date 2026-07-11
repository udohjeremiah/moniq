import node from "eslint-plugin-n";

import { baseConfig } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const nodeConfig = [
  ...baseConfig,
  node.configs["flat/recommended-module"],
  {
    rules: {
      "n/no-missing-import": "off",
    },
  },
  {
    files: ["**/*.test.*"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
];
