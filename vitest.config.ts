import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup/unit.setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    // Prisma's pg adapter reads this at construction time (db.ts is pulled in
    // transitively by auth.ts). A syntactically valid URL is enough — no unit
    // test opens a connection.
    env: {
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
