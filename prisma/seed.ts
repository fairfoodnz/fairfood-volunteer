import { PrismaClient, ProgramSlug, Role } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const programs = [
  {
    slug: ProgramSlug.KAI_BOX,
    title: "Pack Kai Boxes",
    tagline: "Sort, pack, share",
    description:
      "Help sort fresh fruit, vegetables and pantry goods rescued from across Tāmaki Makaurau, then pack them into kai boxes that go straight to whānau, foodbanks and community groups the same day.",
    order: 1,
    image: "/photos/kai-box.webp",
    weeklySlots: [
      { day: 1, start: "09:00", end: "12:00", capacity: 12 },
      { day: 1, start: "13:00", end: "16:00", capacity: 12 },
      { day: 2, start: "09:00", end: "12:00", capacity: 12 },
      { day: 3, start: "09:00", end: "12:00", capacity: 12 },
      { day: 4, start: "09:00", end: "12:00", capacity: 12 },
      { day: 5, start: "09:00", end: "12:00", capacity: 12 },
      { day: 6, start: "09:00", end: "12:00", capacity: 8 },
    ],
  },
  {
    slug: ProgramSlug.CONSCIOUS_KITCHEN,
    title: "Conscious Kitchen",
    tagline: "Cook with us",
    description:
      "Roll up your sleeves with our chefs to turn surplus ingredients into beautiful meals. Whether you're a pro in the kitchen or just like to eat, there's a place for you at the bench.",
    order: 2,
    image: "/photos/kitchen.webp",
    weeklySlots: [
      { day: 2, start: "09:00", end: "12:00", capacity: 6 },
      { day: 3, start: "09:00", end: "12:00", capacity: 6 },
      { day: 4, start: "09:00", end: "12:00", capacity: 6 },
    ],
  },
  {
    slug: ProgramSlug.WORK_SKILLS,
    title: "Work Skills Programme",
    tagline: "Nine weeks, real work, real skills",
    description:
      "A nine-week programme for rangatahi and adults building confidence and a CV. One day a week, 10am–3pm, working alongside our team in the warehouse and kitchen with a hospitality skills option on Fridays.",
    order: 3,
    image: "/photos/skills.webp",
    weeklySlots: [
      { day: 2, start: "10:00", end: "15:00", capacity: 8 },
      { day: 3, start: "10:00", end: "15:00", capacity: 8 },
      { day: 4, start: "10:00", end: "15:00", capacity: 8 },
      { day: 5, start: "10:00", end: "15:00", capacity: 8, note: "Hospitality skills focus" },
    ],
  },
  {
    slug: ProgramSlug.INCLUSIVE,
    title: "Inclusive Volunteering",
    tagline: "Built for every body",
    description:
      "We modify tasks, allow support people to come along, and welcome groups like the Young Onset Dementia Collective every Monday. Tell us what you need on the form — there's nearly always a way.",
    order: 4,
    image: "/photos/inclusive.webp",
    weeklySlots: [
      { day: 1, start: "10:00", end: "12:00", capacity: 6, note: "Young Onset Dementia Collective" },
      { day: 3, start: "10:00", end: "12:00", capacity: 6 },
    ],
  },
  {
    slug: ProgramSlug.CORPORATE,
    title: "Bring Your Team",
    tagline: "Corporate volunteering",
    description:
      "Over 150 companies have rolled their sleeves up with us. Half-day team experiences combining the warehouse and kitchen, with a debrief over kai. Email us to plan your day.",
    order: 5,
    image: "/photos/team.webp",
    weeklySlots: [],
  },
];

function nextOccurrence(weekday: number, time: string, weeksAhead: number) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff + weeksAhead * 7);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding programs…");
  for (const p of programs) {
    const program = await prisma.program.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        tagline: p.tagline,
        description: p.description,
        imageUrl: p.image,
        order: p.order,
      },
      create: {
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        description: p.description,
        imageUrl: p.image,
        order: p.order,
      },
    });

    for (let week = 0; week < 6; week++) {
      for (const slot of p.weeklySlots) {
        const startsAt = nextOccurrence(slot.day, slot.start, week);
        const endsAt = nextOccurrence(slot.day, slot.end, week);
        const existing = await prisma.shift.findFirst({
          where: { programId: program.id, startsAt },
        });
        if (existing) continue;
        await prisma.shift.create({
          data: {
            programId: program.id,
            startsAt,
            endsAt,
            capacity: slot.capacity,
            notes: "note" in slot ? (slot.note as string) : null,
          },
        });
      }
    }
  }

  console.log("Seeding admin user…");
  await prisma.user.upsert({
    where: { email: "admin@fairfood.test" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@fairfood.test",
      name: "Admin Kaiārahi",
      role: Role.ADMIN,
    },
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
