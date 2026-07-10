import node from "eslint-plugin-n";

import { baseConfig } from "./base.js";

export const nodeConfig = [
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
