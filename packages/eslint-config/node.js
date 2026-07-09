import base from "./base.js";
import node from "eslint-plugin-n";

const config = [
  ...base,
  node.configs["flat/recommended-module"],
  {
    rules: {
      "n/no-missing-import": "off",
    },
  },
];

export default config;
