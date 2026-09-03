const globals = require("globals");

// Minimal, low-friction config: catch real bugs (undefined vars, unreachable
// code, etc.) without imposing a style guide on existing code. Style/format
// rules are intentionally left out so this doesn't produce hundreds of
// cosmetic warnings on day one.
module.exports = [
  {
    files: ["src/**/*.js"],
    ignores: ["src/**/__tests__/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-undef": "error",
      "no-const-assign": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      "no-fallthrough": "error",
      "no-case-declarations": "error",
      "no-var": "warn",
      eqeqeq: ["warn", "smart"],
    },
  },
  {
    files: ["src/**/__tests__/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-undef": "error",
    },
  },
];
