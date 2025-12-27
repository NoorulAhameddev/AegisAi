import js from "@eslint/js";

const eslintConfig = [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];

export default eslintConfig;
