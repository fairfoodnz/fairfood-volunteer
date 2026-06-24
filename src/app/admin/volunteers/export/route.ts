import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma";
import { resolveVolunteerQuery } from "../query";

export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

// File-safe UTC date stamp (YYYY-MM-DD) for the download filename.
const FILE_STAMP = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Pacific/Auckland",
});

const COLUMNS = [
  "First name",
  "Last name",
  "Email",
  "Phone",
  "Role",
  "Profile complete",
  "Confirmed bookings",
  "Last booking",
  "Joined",
] as const;

export async function GET(request: Request) {
  await requireAdmin();

  const params = new URL(request.url).searchParams;

  // An explicit `ids` list (hand-picked rows in the table) wins over the
  // filter params — the user has told us exactly who to export. Otherwise we
  // export everyone matching the current audience filters.
  const idsParam = params.get("ids")?.trim();
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const resolved = resolveVolunteerQuery({
    q: params.get("q") ?? undefined,
    filter: params.get("filter") ?? undefined,
    sort: params.get("sort") ?? undefined,
    programme: params.get("programme") ?? undefined,
    scope: params.get("scope") ?? undefined,
  });
  const where = ids ? { id: { in: ids } } : resolved.where;
  const orderBy = resolved.orderBy;

  const users = await db.user.findMany({
    where,
    orderBy,
    include: {
      _count: {
        select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const rows = users.map((u) => [
    u.firstName,
    u.lastName ?? "",
    u.email,
    u.phone ?? "",
    u.role,
    u.profileCompletedAt ? "Yes" : "No",
    String(u._count.bookings),
    u.bookings[0] ? NZ_DATE.format(u.bookings[0].createdAt) : "",
    NZ_DATE.format(u.createdAt),
  ]);

  const lines = [COLUMNS, ...rows].map((row) => row.map(csvCell).join(","));
  // Lead with a UTF-8 BOM so Excel reads accented names (e.g. Māori macrons)
  // correctly, and CRLF line endings per RFC 4180.
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  const slugPart = ids ? "selected" : resolved.programme === "all" ? "all" : resolved.programme;
  const filename = `volunteers-${slugPart}-${FILE_STAMP.format(new Date())}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Quote a CSV field per RFC 4180 and neutralise spreadsheet formula injection:
 * a value starting with = + - @ (or tab/CR) is prefixed with a single quote so
 * Excel/Sheets treats it as text rather than executing it.
 */
function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  if (/[",\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}
