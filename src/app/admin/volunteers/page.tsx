import { db } from "@/lib/db";
import { BookingStatus, Role } from "@/generated/prisma";
import { fullName } from "@/lib/users";
import {
  resolveVolunteerQuery,
  audienceFacets,
  type VolunteerQueryParams,
} from "./query";
import { VolunteersFilters } from "./volunteers-filters";
import { VolunteersTable, type VolunteerRow } from "./volunteers-table";

export const metadata = { title: "Volunteers · Admin" };
export const dynamic = "force-dynamic";

const ROW_CAP = 200;

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<VolunteerQueryParams>;
}) {
  const raw = await searchParams;
  const resolved = resolveVolunteerQuery(raw);
  const { where, orderBy, programme } = resolved;

  const programmes = await db.program.findMany({
    orderBy: [{ active: "desc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  const programmeTitle =
    programme === "all"
      ? null
      : (programmes.find((p) => p.slug === programme)?.title ?? programme);

  // Status-facet counts honour the *other* active facets (programme / booking /
  // search) but not the status itself, so each segment shows how many of the
  // current audience fall into it. Reusing resolveVolunteerQuery keeps the
  // count predicates identical to what the table renders.
  const countFor = (filter: string) =>
    db.user.count({ where: resolveVolunteerQuery({ ...raw, filter }).where });

  const [users, countAll, countFlagged, countPending, countAdmins] =
    await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        take: ROW_CAP,
        include: {
          _count: {
            select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
          },
          bookings: {
            where: { shift: { cancelled: false } },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              shift: {
                select: { program: { select: { slug: true, title: true } } },
              },
            },
          },
        },
      }),
      countFor("all"),
      countFor("flagged"),
      countFor("pending"),
      countFor("admins"),
    ]);

  const rows: VolunteerRow[] = users.map((u) => {
    const programmeMap = new Map<string, { slug: string; title: string }>();
    for (const b of u.bookings) {
      const p = b.shift.program;
      if (!programmeMap.has(p.slug)) programmeMap.set(p.slug, p);
    }
    return {
      id: u.id,
      name: fullName(u),
      email: u.email,
      phone: u.phone,
      isAdmin: u.role === Role.ADMIN,
      profileComplete: u.profileCompletedAt !== null,
      flagged: !!(u.arrestHistory || u.healthConditions),
      confirmedCount: u._count.bookings,
      lastActive: u.bookings[0] ? NZ_DATE.format(u.bookings[0].createdAt) : null,
      joined: NZ_DATE.format(u.createdAt),
      programmes: [...programmeMap.values()],
    };
  });

  const facets = audienceFacets(resolved, programmeTitle);

  // Carry the active audience through to the CSV route verbatim.
  const exportParams = new URLSearchParams();
  if (resolved.search) exportParams.set("q", resolved.search);
  if (resolved.filter !== "all") exportParams.set("filter", resolved.filter);
  if (resolved.sort !== "recent") exportParams.set("sort", resolved.sort);
  if (resolved.programme !== "all")
    exportParams.set("programme", resolved.programme);
  if (resolved.scope !== "all") exportParams.set("scope", resolved.scope);
  const exportQs = exportParams.toString();
  const exportAllHref = `/admin/volunteers/export${exportQs ? `?${exportQs}` : ""}`;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="eyebrow">Volunteers</p>
          <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Find &amp; export volunteers
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Filter to the people you need, then copy their emails or export a
            CSV. Tick rows to pull a hand-picked group.
          </p>
        </header>

        <VolunteersFilters
          programmes={programmes}
          counts={{
            all: countAll,
            flagged: countFlagged,
            pending: countPending,
            admins: countAdmins,
          }}
        />

        <VolunteersTable
          rows={rows}
          capped={rows.length >= ROW_CAP}
          facets={facets}
          exportAllHref={exportAllHref}
        />
      </div>
    </div>
  );
}
