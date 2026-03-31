import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      enabled: false,
    },
  },
});
