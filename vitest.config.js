import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only — exclude the Playwright E2E dir and deps.
    include: ["tests/**/*.test.js"],
    exclude: ["e2e/**", "node_modules/**"],
    environment: "node",
  },
});
