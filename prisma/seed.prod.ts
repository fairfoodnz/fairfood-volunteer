// Production seed — runs at container startup after `prisma migrate deploy`
// (see Dockerfile CMD). Strictly idempotent: every operation is an upsert or a
// "create if missing", and no data is ever deleted (the one exception is
// revoking the sessions of an admin still on the retired default password —
// see seedAdmin). Safe to run on every boot.
//
// Scope (kept deliberately small):
//   1. The three real programmes (Kai Sorting, Conscious Kitchen, Inclusive
//      Volunteering) — created by slug only if missing. Once a programme row
//      exists the database is the source of truth: coordinators edit the
//      editorial copy from /admin/programmes and this seed never overwrites it.
//   2. One ADMIN user (admin@fairfood.org.nz) — created only when the database
//      has no admin at all, and created without a password.
//
// Coordinators handle shifts, shift templates and uploaded resources from the
// /admin UI; those are NOT seeded — operational data lives in the database, not
// in source.

import { PrismaClient, Role } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Bootstrap admin account. It's created with no password: whoever controls the
// admin@fairfood.org.nz inbox sets one through "Forgot password" on
// /auth/sign-in. That ties first access to the inbox instead of a password
// published in this repo.
const ADMIN_EMAIL = "admin@fairfood.org.nz";
// The hash this seed used to ship for the default password "admin123". bcrypt
// salts per hash, so an exact string match means the account is still on that
// committed default and was never changed — seedAdmin retires it.
const RETIRED_DEFAULT_PASSWORD_HASH =
  "$2b$10$1ww8kgt9YrkZsZdB34xQL.P7oer4bx.5QMUoXwgbYkD.1RXaLuZiO";

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

type AdminSeedOutcome = "retired-default" | "exists" | "skipped" | "created";

async function seedAdmin(): Promise<AdminSeedOutcome> {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, passwordHash: true },
  });
  if (existing) {
    // Never touch role, name or a password someone chose. The old seed put the
    // role back to ADMIN on every boot, which undid a deliberate demotion.
    if (existing.passwordHash !== RETIRED_DEFAULT_PASSWORD_HASH) return "exists";
    // Still on the published default: anyone could have signed in with it, so
    // clear it and end every session it opened. The owner sets a new password
    // through "Forgot password".
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash: null },
      }),
      prisma.session.deleteMany({ where: { userId: existing.id } }),
    ]);
    return "retired-default";
  }

  // Only bootstrap a database that has no admin at all. Once coordinators
  // exist, deleting this account should keep it deleted.
  const admins = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (admins > 0) return "skipped";

  // Upsert rather than create so two containers booting at once can't both
  // try to insert and crash the loser with P2002.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      firstName: "Admin",
      lastName: null,
      role: Role.ADMIN,
      passwordHash: null,
      // Pre-mark the bootstrap account profile-complete + email-verified so the
      // booking gates and verification banner don't get in the way of the
      // coordinator's first sign-in. Real volunteer accounts go through the
      // normal questionnaire + email-link flow.
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
  return "created";
}

const ADMIN_SEED_MESSAGES: Record<AdminSeedOutcome, string> = {
  "retired-default": `${ADMIN_EMAIL} was still on the old default password. It has been cleared and its sessions revoked — set a new one with "Forgot password" on /auth/sign-in.`,
  exists: `${ADMIN_EMAIL} present; left unchanged.`,
  skipped: `${ADMIN_EMAIL} absent but other admins exist; not recreated.`,
  created: `${ADMIN_EMAIL} created with no password — set one with "Forgot password" on /auth/sign-in.`,
};

export async function main() {
  try {
    console.log("[seed.prod] Ensuring programmes (create-if-missing)…");
    const programCount = await seedPrograms();
    console.log(`[seed.prod]   ${programCount} programme slugs confirmed.`);

    console.log("[seed.prod] Ensuring bootstrap admin…");
    const outcome = await seedAdmin();
    console.log(`[seed.prod]   ${ADMIN_SEED_MESSAGES[outcome]}`);

    console.log("[seed.prod] Done.");
  } finally {
    await prisma.$disconnect();
  }
}
