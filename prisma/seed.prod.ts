// Production seed — runs at container startup after `prisma migrate deploy`
// (see Dockerfile CMD). Strictly idempotent: every operation is an upsert or a
// "create if missing", and NOTHING is ever deleted. Safe to run on every boot.
//
// Scope (kept deliberately small):
//   1. The three real programmes (Kai Sorting, Conscious Kitchen, Inclusive
//      Volunteering) — created by slug only if missing. Once a programme row
//      exists the database is the source of truth: coordinators edit the
//      editorial copy from /admin/programmes and this seed never overwrites it.
//   2. One ADMIN user (admin@fairfood.org.nz) — created only if missing.
//
// Coordinators handle shifts, shift templates and uploaded resources from the
// /admin UI; those are NOT seeded — operational data lives in the database, not
// in source.

import { PrismaClient, Role } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Bootstrap admin account. Sign-in uses password "admin123" — change it
// immediately after the first login from /me/security (or by triggering a
// password reset). The bcrypt hash below is bcryptjs.hashSync("admin123", 10)
// pre-computed at authoring time so this script doesn't need bcryptjs at
// runtime (the /opt/migrator install in the Dockerfile is intentionally minimal
// — see CLAUDE.md). It matches the cost factor in src/lib/auth.ts.
const ADMIN_EMAIL = "admin@fairfood.org.nz";
const ADMIN_PASSWORD_HASH =
  "$2b$10$1ww8kgt9YrkZsZdB34xQL.P7oer4bx.5QMUoXwgbYkD.1RXaLuZiO"; // "admin123"

const programs = [
  {
    slug: "kai-box",
    title: "Kai Sorting",
    tagline: "Sort, pack, share",
    description:
      "Help sort fresh fruit, vegetables and pantry goods rescued from across Tāmaki Makaurau, then pack them into kai boxes that go straight to whānau, foodbanks and community groups the same day.",
    schedule: "Mon – Fri",
    order: 1,
    image: "/photos/kai-box.webp",
    theme: "cream",
    contactEmail: "volunteering@fairfood.org.nz",
    contactPhone: "(09) 555-1234",
    gettingHere:
      "Free street parking. We’re a five-minute walk from Avondale train station.",
  },
  {
    slug: "conscious-kitchen",
    title: "Conscious Kitchen",
    tagline: "Cook with us",
    description:
      "Roll up your sleeves with our chefs to turn surplus ingredients into beautiful meals. Whether you're a pro in the kitchen or just like to eat, there's a place for you at the bench.",
    schedule: "Tues – Thurs",
    order: 2,
    image: "/photos/kitchen.webp",
    theme: "charcoal",
    contactEmail: "volunteering@fairfood.org.nz",
    contactPhone: "(09) 555-1234",
    gettingHere:
      "Free street parking. We’re a five-minute walk from Avondale train station.",
  },
  {
    slug: "inclusive",
    title: "Inclusive Volunteering",
    tagline: "Built for every body",
    description:
      "We modify tasks, allow support people to come along, and welcome groups like the Young Onset Dementia Collective every Monday. We arrange these sessions directly with your group — tell us what you need when you get in touch. There's nearly always a way.",
    schedule: null as string | null,
    order: 3,
    image: "/photos/inclusive.webp",
    theme: "forest",
    contactEmail: "volunteering@fairfood.org.nz",
    contactPhone: "(09) 555-1234",
    gettingHere:
      "Free street parking. We’re a five-minute walk from Avondale train station. Support people are welcome — let us know who’s coming.",
  },
];

async function seedPrograms() {
  for (const p of programs) {
    const fields = {
      title: p.title,
      tagline: p.tagline,
      description: p.description,
      schedule: p.schedule,
      imageUrl: p.image,
      order: p.order,
      theme: p.theme,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      gettingHere: p.gettingHere,
    };
    // Create-if-missing only. The DB is the source of truth for programme
    // editorial copy once a row exists — coordinators edit title, tagline,
    // description, schedule, contact details, etc. from /admin/programmes, and
    // an `update` here would silently clobber those edits on every container
    // boot (the Dockerfile runs this seed after `migrate deploy`). So we seed
    // the literals only when the programme doesn't exist yet, and never touch
    // an existing row — mirroring how seedAdmin() below keeps its update
    // minimal for the same reason.
    await prisma.program.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, ...fields },
    });
  }
  return programs.length;
}

async function seedAdmin() {
  // Atomic upsert — safe against the TOCTOU race where two containers boot
  // simultaneously, both observe the row absent, and both attempt `create`
  // (the loser would crash with P2002 and stop the container from starting).
  //
  // The `update` payload is intentionally minimal: it self-heals the role
  // back to ADMIN if someone downgraded the bootstrap account, but never
  // touches `passwordHash`, `firstName`, `lastName`, `profileCompletedAt`,
  // or `emailVerifiedAt`. After first login the coordinator will rotate the
  // password and probably fill in a real name — overwriting either of those
  // on every boot would silently re-enable the well-known default password
  // and clobber their edits.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: Role.ADMIN },
    create: {
      email: ADMIN_EMAIL,
      firstName: "Admin",
      lastName: null,
      role: Role.ADMIN,
      passwordHash: ADMIN_PASSWORD_HASH,
      // Pre-mark the bootstrap account profile-complete + email-verified so the
      // booking gates and verification banner don't get in the way of the
      // coordinator's first sign-in. Real volunteer accounts go through the
      // normal questionnaire + email-link flow.
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
}

export async function main() {
  try {
    console.log("[seed.prod] Upserting programmes…");
    const programCount = await seedPrograms();
    console.log(`[seed.prod]   ${programCount} programmes in sync.`);

    console.log("[seed.prod] Ensuring bootstrap admin…");
    await seedAdmin();
    console.log(
      `[seed.prod]   ${ADMIN_EMAIL} present with ADMIN role. If this is a fresh DB, the default password is "admin123" — change it on first login.`,
    );

    console.log("[seed.prod] Done.");
  } finally {
    await prisma.$disconnect();
  }
}
