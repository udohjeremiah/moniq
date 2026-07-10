import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import * as depend from "eslint-plugin-depend";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import * as onlyWarn from "eslint-plugin-only-warn";
import * as perfectionist from "eslint-plugin-perfectionist";
import promise from "eslint-plugin-promise";
import * as regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import * as sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import { globalIgnores } from "eslint/config";
import * as tseslint from "typescript-eslint";

export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  depend.configs["flat/recommended"],
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  perfectionist.configs["recommended-natural"],
  security.configs.recommended,
  promise.configs["flat/recommended"],
  regexp.configs.recommended,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["base.js", "node.js", "eslint.config.js"],
        },
      },
    },
    plugins: {
      onlyWarn,
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "import-x/no-default-export": "error",
      "import-x/order": "off",
      "promise/no-multiple-resolved": "error",
      "promise/prefer-await-to-callbacks": "error",
      "promise/prefer-await-to-then": "error",
      "promise/prefer-catch": "error",
      "promise/spec-only": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver(),
        createNodeResolver(),
      ],
    },
  },
  {
    files: ["**/*.config.*"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
  prettier,
  globalIgnores(["dist/**"]),
];
