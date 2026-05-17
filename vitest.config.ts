import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "apps/*/app/**/*.test.ts", "apps/*/lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@chetana/shared": path.resolve(__dirname, "packages/shared/src"),
      "@chetana/models": path.resolve(__dirname, "packages/models/src"),
      "@chetana/probes": path.resolve(__dirname, "packages/probes/src"),
      "@chetana/scorer": path.resolve(__dirname, "packages/scorer/src"),
    },
  },
});
