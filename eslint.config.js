import js from "@eslint/js";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      parser: babelParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-react"] },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    settings: {
      react: { version: "18" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/react-in-jsx-scope": "off",
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      indent: ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
