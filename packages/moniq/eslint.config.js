import { nodeConfig } from "@moniq/eslint-config/node";

export default [
  ...nodeConfig,
  {
    rules: {
      "n/no-unpublished-import": "off",
    },
  },
  {
    files: ["src/cli.ts"],
    rules: {
      "n/hashbang": "off",
    },
  },
];
