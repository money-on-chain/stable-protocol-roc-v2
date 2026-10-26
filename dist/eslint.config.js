import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import noOnlyTests from "eslint-plugin-no-only-tests";
export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, eslintPluginPrettierRecommended, {
    ignores: [
        "artifacts/",
        "build/",
        "cache/",
        "coverage/",
        "dist/",
        "lib/",
        "node_modules/",
        "typechain/",
        "profiles/",
        "docs/",
        ".gitlab/",
        ".vscode/",
        ".solcover.js",
        ".commitlintrc.js",
        "eslint.config.js",
        "coverage.json",
        "soljson-latest.js",
    ],
}, {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
        parserOptions: {
            project: "./tsconfig.json",
        },
    },
    plugins: {
        "no-only-tests": noOnlyTests,
    },
    rules: {
        "@typescript-eslint/no-floating-promises": ["error", { ignoreIIFE: true, ignoreVoid: true }],
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        "no-only-tests/no-only-tests": "error",
    },
}, {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
        "no-only-tests": noOnlyTests,
    },
    rules: {
        "no-only-tests/no-only-tests": "error",
    },
});
//# sourceMappingURL=eslint.config.js.map