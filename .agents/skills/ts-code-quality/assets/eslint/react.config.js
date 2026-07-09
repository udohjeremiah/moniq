import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

const config = [
  eslintReact.configs["strict-type-checked"],
  jsxA11y.flatConfigs.strict,
  {
    languageOptions: {
      ...jsxA11y.flatConfigs.strict.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
];

export default config;
