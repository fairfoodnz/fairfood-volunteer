#!/usr/bin/env node
// Fails when the Dockerfile's isolated /opt/migrator install pins a different
// version than the one pnpm-lock.yaml resolves for the app. A drift means
// `prisma migrate deploy` / `prisma db seed` run on a different Prisma than the
// runtime client — and Dependabot bumps package.json without touching the
// Dockerfile, so this is how it gets caught. Run in CI (lint-build job).
import { readFileSync } from "node:fs";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
const lockfile = readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");

// The `npm install ... pkg@x.y.z ...` RUN instruction, backslash-continued.
const install = dockerfile.match(/(?<!p)npm install(?:[^\n]*\\\n)*[^\n]*/);
if (!install) {
  console.error("check-migrator-pins: no `npm install` line found in Dockerfile");
  process.exit(1);
}
const pins = [...install[0].matchAll(/(?:^|\s)((?:@[\w.-]+\/)?[\w.-]+)@(\d+\.\d+\.\d+)/g)].map(
  ([, name, version]) => ({ name, version }),
);
if (pins.length === 0) {
  console.error("check-migrator-pins: no pinned packages found in the Dockerfile install");
  process.exit(1);
}

// Root importer only: everything between `  .:` and the next top-level key.
const root = lockfile.split(/^importers:\n\n  \.:\n/m)[1]?.split(/^\S/m)[0] ?? "";

let failed = false;
for (const { name, version } of pins) {
  const key = name.startsWith("@") ? `'${name}'` : name;
  const escaped = key.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const entry = root.match(new RegExp(`^      ${escaped}:\\n        specifier: .*\\n        version: (\\d+\\.\\d+\\.\\d+)`, "m"));
  if (!entry) {
    console.error(`✗ ${name}: pinned in Dockerfile but not a direct dependency in pnpm-lock.yaml`);
    failed = true;
  } else if (entry[1] !== version) {
    console.error(`✗ ${name}: Dockerfile pins ${version}, pnpm-lock.yaml resolves ${entry[1]}`);
    failed = true;
  } else {
    console.log(`✓ ${name}@${version}`);
  }
}

if (failed) {
  console.error("\nUpdate the /opt/migrator `npm install` line in the Dockerfile to match.");
  process.exit(1);
}
