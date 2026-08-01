// @ts-check

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    rules: {
      "import-x/no-default-export": "off",
      "security/detect-object-injection": "warn",
    },
  },
];

export default config;
