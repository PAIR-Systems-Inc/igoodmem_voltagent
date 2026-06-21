import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000, // retrieval with waitForIndexing needs time
    include: ["e2e/tests/**/*.e2e.test.ts"],
    fileParallelism: false, // run test files sequentially — they share a GoodMem server
    sequence: {
      concurrent: false, // run tests within a file sequentially
    },
  },
});
