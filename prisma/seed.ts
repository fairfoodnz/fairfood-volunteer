import {
  BookingStatus,
  HeardAbout,
  PrismaClient,
  Role,
} from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// bcryptjs hash of "fairfood" (10 rounds). Used only for seeded accounts; real
// signups hash their own password in src/app/auth/actions.ts. Replace in prod.
const SEED_PASSWORD_HASH =
  "$2b$10$.3M46YAu7KP.OfKnE6b2guF3RR/Zxn/Y3SgNT620XZvZvX5OoB6Su";

// Seeded volunteers live on this email domain so they're easy to identify
// and wipe between seeds. Test logins (admin@fairfood.test, volunteer@fairfood.test)
// stay untouched.
const SEED_EMAIL_DOMAIN = "seed.fairfood.test";

const WEEKS_BACK = 4;
const WEEKS_FORWARD = 6;

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
    weeklySlots: [
      { day: 1, start: "09:00", end: "12:00", capacity: 12 },
      { day: 1, start: "13:00", end: "16:00", capacity: 12 },
      { day: 2, start: "09:00", end: "12:00", capacity: 12 },
      { day: 3, start: "09:00", end: "12:00", capacity: 12 },
      { day: 4, start: "09:00", end: "12:00", capacity: 12 },
      { day: 5, start: "09:00", end: "12:00", capacity: 12 },
      { day: 6, start: "09:00", end: "12:00", capacity: 8 },
    ],
    templates: [
      { label: "Morning pack", start: "09:00", end: "12:00", capacity: 12 },
      { label: "Afternoon pack", start: "13:00", end: "16:00", capacity: 12 },
      { label: "Saturday pack", start: "09:00", end: "12:00", capacity: 8 },
    ],
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
    weeklySlots: [
      { day: 2, start: "09:00", end: "12:00", capacity: 6 },
      { day: 3, start: "09:00", end: "12:00", capacity: 6 },
      { day: 4, start: "09:00", end: "12:00", capacity: 6 },
    ],
    templates: [
      { label: "Morning cook", start: "09:00", end: "12:00", capacity: 6 },
    ],
  },
  {
    slug: "inclusive",
    title: "Inclusive Volunteering",
    tagline: "Built for every body",
    description:
      "We modify tasks, allow support people to come along, and welcome groups like the Young Onset Dementia Collective every Monday. Tell us what you need on the form — there's nearly always a way.",
    schedule: null,
    order: 3,
    image: "/photos/inclusive.webp",
    theme: "forest",
    contactEmail: "volunteering@fairfood.org.nz",
    contactPhone: "(09) 555-1234",
    gettingHere:
      "Free street parking. We’re a five-minute walk from Avondale train station. Support people are welcome — let us know who’s coming.",
    weeklySlots: [
      {
        day: 1,
        start: "10:00",
        end: "12:00",
        capacity: 6,
        note: "Young Onset Dementia Collective",
      },
      { day: 3, start: "10:00", end: "12:00", capacity: 6 },
    ],
    templates: [
      {
        label: "Monday collective",
        start: "10:00",
        end: "12:00",
        capacity: 6,
        note: "Young Onset Dementia Collective",
      },
      { label: "Midweek session", start: "10:00", end: "12:00", capacity: 6 },
    ],
  },
];

// Mulberry32 — small, deterministic PRNG so seed output is reproducible.
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(20260512);
const chance = (p: number) => rand() < p;

function shiftWeekStart(week: number, weekday: number, time: string) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff + week * 7);
  d.setHours(h, m, 0, 0);
  return d;
}

type ProgramPref = "kai" | "kitchen" | "inclusive";

type Volunteer = {
  email: string;
  name: string;
  phone: string;
  pronouns?: string;
  birthday?: string; // YYYY-MM-DD
  emergencyName?: string;
  emergencyPhone?: string;
  notes?: string;
  accessNeeds?: string;
  heardAbout?: HeardAbout;
  heardAboutOther?: string;
  whyInterested?: string;
  arrestHistory?: boolean;
  arrestDetails?: string;
  healthConditions?: boolean;
  healthDetails?: string;
  // Profile completion gates booking; set false to leave a few people mid-funnel.
  profileComplete: boolean;
  // Coordinator marked as reviewed (for flagged profiles).
  reviewed?: boolean;
  // How keen they are; influences booking count.
  cadence: "regular" | "casual" | "new";
  // Which programs they tend to book.
  prefers: ProgramPref[];
};

const volunteers: Volunteer[] = [
  {
    email: "hemi.ngata@seed.fairfood.test",
    name: "Hemi Ngata",
    phone: "021 432 118",
    pronouns: "he/him",
    birthday: "1986-03-14",
    emergencyName: "Rangi Ngata",
    emergencyPhone: "021 555 9120",
    heardAbout: HeardAbout.FRIEND,
    whyInterested:
      "My cousin volunteers here and won't shut up about it. Time I came along.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "hinemoa.walker@seed.fairfood.test",
    name: "Hinemoa Walker",
    phone: "022 091 7733",
    pronouns: "she/her",
    birthday: "1979-08-02",
    emergencyName: "Paul Walker",
    emergencyPhone: "027 410 8821",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested:
      "Want to do something practical with my Tuesdays now the kids are at school.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "tama.kerei@seed.fairfood.test",
    name: "Tama Kerei",
    phone: "021 778 2210",
    pronouns: "he/him",
    birthday: "2003-11-28",
    emergencyName: "Mereana Kerei",
    emergencyPhone: "021 992 4441",
    heardAbout: HeardAbout.SEARCH,
    whyInterested: "Uni placement hours plus I like the kaupapa.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "casual",
    prefers: ["kai", "kitchen"],
  },
  {
    email: "ariana.tewhata@seed.fairfood.test",
    name: "Ariana Te Whata",
    phone: "027 332 0044",
    pronouns: "she/her",
    birthday: "1992-04-19",
    emergencyName: "Hori Te Whata",
    emergencyPhone: "021 220 9981",
    heardAbout: HeardAbout.WORKPLACE,
    heardAboutOther: undefined,
    whyInterested:
      "I cook for a living and I'd rather spend my day off cooking for people who need it.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kitchen"],
  },
  {
    email: "kiri.ahuriri@seed.fairfood.test",
    name: "Kiri Ahuriri",
    phone: "021 884 3320",
    pronouns: "she/they",
    birthday: "1968-01-22",
    emergencyName: "Moana Ahuriri (support worker)",
    emergencyPhone: "021 661 2200",
    accessNeeds:
      "Use a walking frame — need a seat for sorting and short breaks every 45 min.",
    notes: "Comes with support worker on Mondays.",
    heardAbout: HeardAbout.EVENT,
    whyInterested:
      "Used to volunteer at the City Mission before my hip. Looking for something gentler.",
    arrestHistory: false,
    healthConditions: true,
    healthDetails: "Mobility (hip replacement 2024) and mild asthma — carry inhaler.",
    profileComplete: true,
    cadence: "regular",
    prefers: ["inclusive"],
  },
  {
    email: "tane.rawiri@seed.fairfood.test",
    name: "Tāne Rāwiri",
    phone: "021 554 0098",
    pronouns: "he/him",
    birthday: "1995-07-09",
    emergencyName: "Lani Rāwiri",
    emergencyPhone: "027 882 1109",
    heardAbout: HeardAbout.FRIEND,
    whyInterested: "Friend Ariana dragged me along. Staying because the food is unreal.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kitchen"],
  },
  {
    email: "wiremu.pene@seed.fairfood.test",
    name: "Wiremu Pene",
    phone: "027 119 8842",
    pronouns: "he/him",
    birthday: "1974-05-11",
    emergencyName: "Te Aroha Pene",
    emergencyPhone: "021 880 7732",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested: "Retired early, want to keep moving and meet people.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "mereana.hape@seed.fairfood.test",
    name: "Mereana Hape",
    phone: "021 990 2233",
    pronouns: "she/her",
    birthday: "1989-09-30",
    emergencyName: "Tipene Hape",
    emergencyPhone: "027 661 5544",
    heardAbout: HeardAbout.WORKPLACE,
    whyInterested:
      "Our team has corporate volunteering allowance and this felt aligned with our values.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "manaaki.tuhoro@seed.fairfood.test",
    name: "Manaaki Tūhoro",
    phone: "022 884 1190",
    pronouns: "they/them",
    birthday: "1998-12-04",
    emergencyName: "Awhina Tūhoro",
    emergencyPhone: "021 442 8821",
    heardAbout: HeardAbout.SEARCH,
    whyInterested:
      "Studying nutrition. Want to see surplus food rescue in action, not just on paper.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kitchen", "kai"],
  },
  {
    email: "sione.tupou@seed.fairfood.test",
    name: "Sione Tupou",
    phone: "021 670 4421",
    pronouns: "he/him",
    birthday: "1982-02-18",
    emergencyName: "Lolesio Tupou",
    emergencyPhone: "027 332 7700",
    heardAbout: HeardAbout.FRIEND,
    whyInterested: "Church group does Saturday packs. Brought my whole van load.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "sela.fifita@seed.fairfood.test",
    name: "Sela Fifita",
    phone: "021 339 4490",
    pronouns: "she/her",
    birthday: "2000-06-15",
    emergencyName: "Salesi Fifita",
    emergencyPhone: "027 119 5582",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested: "Saw the TikTok about the kai box drop-offs and signed up that night.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "new",
    prefers: ["kai"],
  },
  {
    email: "latu.vakauta@seed.fairfood.test",
    name: "Latu Vaka'uta",
    phone: "021 442 0098",
    pronouns: "he/him",
    birthday: "1990-10-08",
    emergencyName: "Mele Vaka'uta",
    emergencyPhone: "027 882 4410",
    heardAbout: HeardAbout.WORKPLACE,
    whyInterested:
      "My workplace gives us paid days for community work — picked Fair Food.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "anaru.watene@seed.fairfood.test",
    name: "Anaru Watene",
    phone: "021 770 9982",
    pronouns: "he/him",
    birthday: "1985-03-22",
    emergencyName: "Kahurangi Watene",
    emergencyPhone: "027 442 7720",
    heardAbout: HeardAbout.OTHER,
    heardAboutOther: "Probation officer suggested it.",
    whyInterested:
      "Doing community hours. Honestly hoping I like it enough to stick around after.",
    arrestHistory: true,
    arrestDetails:
      "Conviction for assault (2022). Served sentence, currently on community-based order. Officer can be contacted on request.",
    healthConditions: false,
    profileComplete: true,
    reviewed: false,
    cadence: "casual",
    prefers: ["kai"],
  },
  {
    email: "te.aroha.mihaka@seed.fairfood.test",
    name: "Te Aroha Mihaka",
    phone: "022 119 3340",
    pronouns: "she/her",
    birthday: "1996-08-27",
    emergencyName: "Hone Mihaka",
    emergencyPhone: "021 663 5520",
    heardAbout: HeardAbout.EVENT,
    whyInterested:
      "Met the team at Pasifika festival. Stayed in touch and finally booked in.",
    arrestHistory: true,
    arrestDetails:
      "Drink-driving conviction 2018. Spent and disclosed for transparency.",
    healthConditions: false,
    profileComplete: true,
    reviewed: true,
    cadence: "regular",
    prefers: ["kai", "kitchen"],
  },
  {
    email: "lucia.ferraro@seed.fairfood.test",
    name: "Lucia Ferraro",
    phone: "021 555 1129",
    pronouns: "she/her",
    birthday: "1971-11-03",
    emergencyName: "Marco Ferraro",
    emergencyPhone: "027 992 0021",
    heardAbout: HeardAbout.FRIEND,
    whyInterested:
      "Cooked in restaurants for 30 years. Want to use it for something that matters.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kitchen"],
  },
  {
    email: "meilin.chen@seed.fairfood.test",
    name: "Mei-Lin Chen",
    phone: "021 998 4421",
    pronouns: "she/her",
    birthday: "1994-12-19",
    emergencyName: "Hua Chen",
    emergencyPhone: "027 220 1109",
    heardAbout: HeardAbout.SEARCH,
    whyInterested: "Reducing food waste matters to me. Wanted to be hands-on for once.",
    arrestHistory: false,
    healthConditions: true,
    healthDetails: "Severe peanut allergy — carry EpiPen.",
    profileComplete: true,
    reviewed: true,
    cadence: "new",
    prefers: ["kitchen"],
  },
  {
    email: "priya.naidu@seed.fairfood.test",
    name: "Priya Naidu",
    phone: "021 442 8820",
    pronouns: "she/her",
    birthday: "1988-07-14",
    emergencyName: "Anil Naidu",
    emergencyPhone: "027 119 6630",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested: "Maternity leave with energy to burn. The babies sleep here too 😅.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "joon.park@seed.fairfood.test",
    name: "Joon Park",
    phone: "022 339 7741",
    pronouns: "he/him",
    birthday: "2002-01-08",
    emergencyName: "Soo-jin Park",
    emergencyPhone: "021 880 5520",
    heardAbout: HeardAbout.SEARCH,
    whyInterested: "Need volunteer hours for residency application. Open to anything.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "casual",
    prefers: ["kai"],
  },
  {
    email: "eva.andersen@seed.fairfood.test",
    name: "Eva Andersen",
    phone: "021 660 2218",
    pronouns: "she/her",
    birthday: "1990-04-02",
    emergencyName: "Niels Andersen",
    emergencyPhone: "027 220 8841",
    heardAbout: HeardAbout.EVENT,
    whyInterested: "Visiting from Denmark for 6 months — want to give back while I'm here.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "casual",
    prefers: ["kai", "kitchen"],
  },
  {
    email: "jamie.oconnor@seed.fairfood.test",
    name: "Jamie O'Connor",
    phone: "021 770 5582",
    pronouns: "they/them",
    birthday: "1997-09-21",
    emergencyName: "Caitlin O'Connor",
    emergencyPhone: "027 119 2210",
    heardAbout: HeardAbout.FRIEND,
    whyInterested: "Saturdays are mine now and I'd rather be useful than scrolling.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai"],
  },
  {
    email: "tahlia.sefo@seed.fairfood.test",
    name: "Tahlia Sefo",
    phone: "022 442 9930",
    pronouns: "she/her",
    birthday: "1999-05-30",
    emergencyName: "Lemoa Sefo",
    emergencyPhone: "021 663 4420",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested: "Just moved up from Wellington and want to meet people.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: false,
    cadence: "new",
    prefers: ["kai"],
  },
  {
    email: "atarangi.hawira@seed.fairfood.test",
    name: "Atarangi Hawira",
    phone: "021 882 0091",
    pronouns: "she/her",
    birthday: "1958-02-12",
    emergencyName: "Whetu Hawira",
    emergencyPhone: "027 220 4410",
    notes: "Part of Young Onset Dementia Collective — Monday mornings only.",
    accessNeeds:
      "Routine matters: same task each session, same buddy if possible. Husband walks her in.",
    heardAbout: HeardAbout.OTHER,
    heardAboutOther: "Referred via Dementia NZ coordinator.",
    whyInterested:
      "Loves being around people and food. Family says she comes home glowing.",
    arrestHistory: false,
    healthConditions: true,
    healthDetails:
      "Young Onset Dementia — diagnosed 2022. No medical interventions needed on site; just predictability.",
    profileComplete: true,
    reviewed: true,
    cadence: "regular",
    prefers: ["inclusive"],
  },
  {
    email: "renee.vaughan@seed.fairfood.test",
    name: "Renee Vaughan",
    phone: "021 339 8821",
    pronouns: "she/her",
    birthday: "1984-10-26",
    emergencyName: "Mike Vaughan",
    emergencyPhone: "027 119 4420",
    heardAbout: HeardAbout.WORKPLACE,
    whyInterested: "Company day off for volunteering — picked the kitchen.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "casual",
    prefers: ["kitchen"],
  },
  {
    email: "daniel.okafor@seed.fairfood.test",
    name: "Daniel Okafor",
    phone: "022 119 7741",
    pronouns: "he/him",
    birthday: "2001-03-08",
    emergencyName: "Ngozi Okafor",
    emergencyPhone: "021 663 9920",
    heardAbout: HeardAbout.FRIEND,
    whyInterested: "Flatmate brought me along once and I came back.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "casual",
    prefers: ["kai"],
  },
  {
    email: "ngaire.fraser@seed.fairfood.test",
    name: "Ngaire Fraser",
    phone: "021 552 8830",
    pronouns: "she/her",
    birthday: "1961-06-04",
    emergencyName: "Patrick Fraser",
    emergencyPhone: "027 442 1109",
    heardAbout: HeardAbout.EVENT,
    whyInterested:
      "Volunteering here since 2019. Happy to mentor newcomers on the line.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai", "inclusive"],
  },
  {
    email: "leilani.tavita@seed.fairfood.test",
    name: "Leilani Tavita",
    phone: "021 880 4421",
    pronouns: "she/her",
    birthday: "1993-11-17",
    emergencyName: "Faleolo Tavita",
    emergencyPhone: "027 119 8830",
    heardAbout: HeardAbout.SOCIAL,
    whyInterested: "Want my kids to see what community work looks like.",
    arrestHistory: false,
    healthConditions: false,
    profileComplete: false,
    cadence: "new",
    prefers: ["kai"],
  },
];

async function wipeSeedData() {
  // Order matters: bookings → shifts (FK) → seeded users. Templates have no
  // dependents and programmes are upserted (not deleted), so clearing all
  // templates keeps reseeds idempotent — same philosophy as the shift wipe.
  const bookings = await prisma.booking.deleteMany({});
  const shifts = await prisma.shift.deleteMany({});
  const templates = await prisma.shiftTemplate.deleteMany({});
  const users = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
  });
  console.log(
    `Wiped: ${bookings.count} bookings, ${shifts.count} shifts, ${templates.count} templates, ${users.count} seeded volunteers.`,
  );
}

async function seedTemplates(programIds: Record<string, string>) {
  let count = 0;
  for (const p of programs) {
    for (const [i, t] of p.templates.entries()) {
      await prisma.shiftTemplate.create({
        data: {
          programId: programIds[p.slug],
          label: t.label,
          startTime: t.start,
          endTime: t.end,
          capacity: t.capacity,
          notes: "note" in t ? (t.note as string) : null,
          order: i,
        },
      });
      count++;
    }
  }
  return count;
}

async function seedPrograms() {
  const programIds: Record<string, string> = {};
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
    const program = await prisma.program.upsert({
      where: { slug: p.slug },
      update: fields,
      create: { slug: p.slug, ...fields },
    });
    programIds[p.slug] = program.id;
  }
  return programIds;
}

type CreatedShift = {
  id: string;
  programSlug: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

async function seedShifts(programIds: Record<string, string>) {
  const created: CreatedShift[] = [];
  for (const p of programs) {
    for (let week = -WEEKS_BACK; week < WEEKS_FORWARD; week++) {
      for (const slot of p.weeklySlots) {
        const startsAt = shiftWeekStart(week, slot.day, slot.start);
        const endsAt = shiftWeekStart(week, slot.day, slot.end);
        const shift = await prisma.shift.create({
          data: {
            programId: programIds[p.slug],
            startsAt,
            endsAt,
            capacity: slot.capacity,
            notes: "note" in slot ? (slot.note as string) : null,
          },
        });
        created.push({
          id: shift.id,
          programSlug: p.slug,
          startsAt,
          endsAt,
          capacity: slot.capacity,
        });
      }
    }
  }
  return created;
}

const PREF_TO_SLUG: Record<ProgramPref, string> = {
  kai: "kai-box",
  kitchen: "conscious-kitchen",
  inclusive: "inclusive",
};

async function seedUsers() {
  // Test logins — keep stable so devs can sign in.
  const admin = await prisma.user.upsert({
    where: { email: "admin@fairfood.test" },
    update: {
      role: Role.ADMIN,
      passwordHash: SEED_PASSWORD_HASH,
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@fairfood.test",
      name: "Admin Coordinator",
      role: Role.ADMIN,
      passwordHash: SEED_PASSWORD_HASH,
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });

  const mainVolunteer = await prisma.user.upsert({
    where: { email: "volunteer@fairfood.test" },
    update: {
      role: Role.VOLUNTEER,
      passwordHash: SEED_PASSWORD_HASH,
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "volunteer@fairfood.test",
      name: "Aroha Williams",
      role: Role.VOLUNTEER,
      passwordHash: SEED_PASSWORD_HASH,
      profileCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });

  const userByEmail = new Map<string, string>();
  userByEmail.set(mainVolunteer.email, mainVolunteer.id);

  for (const v of volunteers) {
    const created = await prisma.user.create({
      data: {
        email: v.email,
        name: v.name,
        role: Role.VOLUNTEER,
        passwordHash: SEED_PASSWORD_HASH,
        phone: v.phone,
        pronouns: v.pronouns,
        birthday: v.birthday ? new Date(v.birthday) : null,
        emergencyName: v.emergencyName,
        emergencyPhone: v.emergencyPhone,
        notes: v.notes,
        accessNeeds: v.accessNeeds,
        heardAbout: v.heardAbout,
        heardAboutOther: v.heardAboutOther,
        whyInterested: v.whyInterested,
        arrestHistory: v.arrestHistory,
        arrestDetails: v.arrestDetails,
        healthConditions: v.healthConditions,
        healthDetails: v.healthDetails,
        profileCompletedAt: v.profileComplete ? new Date() : null,
        emailVerifiedAt: new Date(),
        flagReviewedAt: v.reviewed ? new Date() : null,
      },
    });
    userByEmail.set(created.email, created.id);
  }

  // Treat the main test volunteer as a regular Kai Box volunteer so they get bookings too.
  const mainAsVolunteer: Volunteer = {
    email: mainVolunteer.email,
    name: mainVolunteer.name,
    phone: "",
    profileComplete: true,
    cadence: "regular",
    prefers: ["kai", "kitchen"],
  };

  return { admin, all: [mainAsVolunteer, ...volunteers], userByEmail };
}

async function seedBookings(
  shifts: CreatedShift[],
  vols: Volunteer[],
  userByEmail: Map<string, string>,
) {
  const now = new Date();
  // Bucket shifts by program for quick preference-based sampling.
  const byProgram: Record<string, CreatedShift[]> = {
    "kai-box": [],
    "conscious-kitchen": [],
    inclusive: [],
  };
  for (const s of shifts) byProgram[s.programSlug].push(s);

  // Track per-shift booking count so we don't blow past capacity.
  const filled: Map<string, number> = new Map();
  shifts.forEach((s) => filled.set(s.id, 0));

  let createdCount = 0;

  for (const v of vols) {
    if (!v.profileComplete) continue; // mid-funnel users skip booking
    const userId = userByEmail.get(v.email);
    if (!userId) continue;

    const targetBookings =
      v.cadence === "regular"
        ? 4 + Math.floor(rand() * 4) // 4–7
        : v.cadence === "casual"
          ? 1 + Math.floor(rand() * 3) // 1–3
          : Math.floor(rand() * 2); // 0–1 (new)

    // Build candidate pool from preferred programs.
    const pool = v.prefers.flatMap((pref) => byProgram[PREF_TO_SLUG[pref]]);
    // Inclusive volunteers should mostly land on inclusive shifts they prefer; that's
    // already handled by `prefers`. For Atarangi, restrict to Monday shifts (her group).
    const restricted =
      v.email === "atarangi.hawira@seed.fairfood.test"
        ? pool.filter((s) => s.startsAt.getDay() === 1)
        : pool;

    // Deterministic shuffle of the candidate pool.
    const shuffled = [...restricted].sort(() => rand() - 0.5);

    let assigned = 0;
    for (const shift of shuffled) {
      if (assigned >= targetBookings) break;
      const current = filled.get(shift.id) ?? 0;
      // Leave a little headroom so the UI shows partial fills, not everything maxed.
      if (current >= shift.capacity) continue;

      const isPast = shift.endsAt < now;
      let status: BookingStatus;
      if (isPast) {
        const r = rand();
        status =
          r < 0.7
            ? BookingStatus.ATTENDED
            : r < 0.85
              ? BookingStatus.NO_SHOW
              : BookingStatus.CANCELLED;
      } else {
        status = chance(0.1)
          ? BookingStatus.CANCELLED
          : BookingStatus.CONFIRMED;
      }

      try {
        await prisma.booking.create({
          data: {
            userId,
            shiftId: shift.id,
            status,
            notes:
              status === BookingStatus.NO_SHOW && chance(0.4)
                ? "Didn't show, no message."
                : null,
          },
        });
        // Only "active" statuses occupy capacity for display purposes; cancelled
        // bookings still get stored but don't count toward fill.
        if (
          status === BookingStatus.CONFIRMED ||
          status === BookingStatus.ATTENDED ||
          status === BookingStatus.NO_SHOW
        ) {
          filled.set(shift.id, current + 1);
        }
        assigned++;
        createdCount++;
      } catch {
        // Unique violation — same user already booked this shift in shuffle. Skip.
      }
    }
  }

  return createdCount;
}

async function main() {
  console.log("Wiping previous seed data…");
  await wipeSeedData();

  console.log("Seeding programs…");
  const programIds = await seedPrograms();

  console.log("Seeding shift templates…");
  const templates = await seedTemplates(programIds);
  console.log(`  ${templates} templates created.`);

  console.log(
    `Seeding shifts (weeks ${-WEEKS_BACK} to +${WEEKS_FORWARD - 1})…`,
  );
  const shifts = await seedShifts(programIds);
  console.log(`  ${shifts.length} shifts created.`);

  console.log("Seeding users…");
  const { all, userByEmail } = await seedUsers();
  console.log(`  ${userByEmail.size} volunteers (incl. test login).`);

  console.log("Seeding bookings…");
  const bookings = await seedBookings(shifts, all, userByEmail);
  console.log(`  ${bookings} bookings created.`);

  console.log("\nDone. Dev logins (password: fairfood):");
  console.log("  admin@fairfood.test       (ADMIN)");
  console.log("  volunteer@fairfood.test   (VOLUNTEER)");
  console.log(
    `  any seeded volunteer at *@${SEED_EMAIL_DOMAIN} — e.g. hemi.ngata@${SEED_EMAIL_DOMAIN}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
