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
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "shared/**/*.spec.ts"],
    environment: "node",
    globals: false,
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
