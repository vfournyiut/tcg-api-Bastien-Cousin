import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import simpleImportSort from "eslint-plugin-simple-import-sort"

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            // Vos règles personnalisées
            eqeqeq: ["error", "always"],
            "prefer-const": ["error", { destructuring: "all" }],
            "no-console": "off",
            "no-debugger": "error",
            "no-unused-expressions": "error",
            "no-var": "error",
            "no-redeclare": "error",
            "@typescript-eslint/no-empty-object-type": "off",
            "no-const-assign": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^",
                    varsIgnorePattern: "^",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": [
                "error",
                { fixToUnknown: true },
            ],

            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },
    {
        ignores: ["node_modules", "dist", "build", "tests", "public"],
    },
)
