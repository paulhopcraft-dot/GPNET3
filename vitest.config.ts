import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  test: {
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "shared/**/*.spec.ts",
      "client/**/*.test.ts",
      "client/**/*.test.tsx",
    ],
    // Default to node for server tests
    environment: "node",
    // Use jsdom for React component tests
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["client/**/*.test.ts", "jsdom"],
    ],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
