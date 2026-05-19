import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    env: {
      // Applied before any test module loads — the reliable place to pin the
      // zone (vs. mutating process.env.TZ at runtime). Keeps bare Date methods
      // deterministic on dev (NZ) and CI (already UTC) alike.
      TZ: "UTC",
      // Prisma's pg adapter reads this at construction time (db.ts is pulled in
      // transitively by auth.ts). A syntactically valid URL is enough — no unit
      // test opens a connection.
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test?schema=public",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "server-only": r("./tests/stubs/server-only.ts"),
      "@": r("./src"),
    },
  },
});
