/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignore noisy files & folders
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "**/page - Copy.tsx",
      "**/page - Copy (2).tsx"
    ],
  },
  // Base Next rules, but *do not* fail builds
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    extends: ["next/core-web-vitals"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/jsx-no-duplicate-props": "off",
      "@next/next/no-html-link-for-pages": "off",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn"
    },
  },
];
