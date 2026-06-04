import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest config for the Greekstack multi-tenant SaaS unit suite.
// - `node` environment: every covered module is pure logic / Node crypto, no DOM.
// - `vite-tsconfig-paths`: resolves the `@/` alias from tsconfig (`@/* -> ./*`)
//   so test imports like `@/lib/auth` work exactly as they do in app code.
// - Only `tests/**/*.test.ts` are collected, so the legacy node:test files under
//   lib/ (e.g. lib/poll-options.test.ts, run via `node --test`) are NOT picked up
//   here and can't collide with the Vitest runner.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
