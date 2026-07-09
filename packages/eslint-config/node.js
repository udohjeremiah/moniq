import node from "eslint-plugin-n";

const config = [
  node.configs["flat/recommended-module"],
  {
    rules: {
      "n/no-missing-import": "off",
    },
  },
];

export default config;
