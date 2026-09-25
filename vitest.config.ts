import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/lib\/auth$/, replacement: path.resolve(process.cwd(), "tests/stubs/auth.ts") },
      { find: "@", replacement: path.resolve(process.cwd(), "src") },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
  },
});
