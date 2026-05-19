// `server-only` throws if it's imported outside a React Server Component.
// Vitest aliases the package to this no-op so we can unit-test the pure
// helpers that happen to live in modules marked `import "server-only"`
// (e.g. safeNextPath / postAuthDestination in src/lib/auth.ts).
export {};
