// Seed dispatcher. `prisma db seed` invokes this file (see prisma.config.ts);
// which seed actually runs depends on NODE_ENV:
//
//   • production → seed.prod.ts  — idempotent, upsert-only, safe on every boot.
//     The Dockerfile CMD chains it after `prisma migrate deploy`.
//   • anything else → seed.dev.ts — wipes seeded rows and rebuilds a rich
//     demo dataset (programmes, shifts, ~30 volunteers, bookings).
//
// We split the files so the destructive dev seed CANNOT run in production by
// accident: NODE_ENV is set to "production" in the runner stage of the
// Dockerfile, and `pnpm dev` / a bare `prisma db seed` locally leaves NODE_ENV
// unset, which lands here on the dev branch.

async function main() {
  if (process.env.NODE_ENV === "production") {
    const { main: runProd } = await import("./seed.prod");
    await runProd();
  } else {
    const { main: runDev } = await import("./seed.dev");
    await runDev();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
