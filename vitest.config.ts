import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "apps/*/app/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@chetana/shared": "/tmp/chetana/packages/shared/src",
      "@chetana/models": "/tmp/chetana/packages/models/src",
      "@chetana/probes": "/tmp/chetana/packages/probes/src",
      "@chetana/scorer": "/tmp/chetana/packages/scorer/src",
    },
  },
});
