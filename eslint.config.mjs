// ESLint flat config (ESLint v9)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

// Fallback for Astro flat config if unavailable
const astroFlat = astro.configs?.["flat/recommended"]; // prefer flat config if plugin supports it

export default [
  // Ignore generated/third-party
  { ignores: ["dist/**", ".astro/**", "node_modules/**"] },

  // JavaScript base
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node }
    }
  },

  // TypeScript (non type-aware + type-aware layer)
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: new URL(".", import.meta.url).pathname
      },
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // 例: 追加したいルールはここに
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // Astro (.astro) files
  ...(astroFlat
    ? astroFlat
    : [
        {
          files: ["**/*.astro"],
          languageOptions: {
            parser: astro.parser,
            parserOptions: {
              // Use TS parser inside <script> blocks
              parser: tseslint.parser
            },
            globals: { ...globals.browser }
          },
          plugins: { astro },
          rules: {
            ...astro.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "off"
          }
        }
      ])
  ,
  // Ensure our Astro-specific overrides apply even if using plugin's flat config
  {
    files: ["**/*.astro"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
