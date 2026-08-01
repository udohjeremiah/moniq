// @ts-check

import tailwindcss from "eslint-plugin-tailwindcss";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  tailwindcss.configs["flat/recommended"],
  {
    rules: {
      "tailwindcss/no-contradicting-classname": "error",
    },
  },
];

export default config;
