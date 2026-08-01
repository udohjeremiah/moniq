// @ts-check

import node from "eslint-plugin-n";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  node.configs["flat/recommended-module"],
];

export default config;
