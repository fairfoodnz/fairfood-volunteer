import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingStatus, Prisma } from "@/generated/prisma";
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

const ID_ORDER: Prisma.UserOrderByWithRelationInput[] = [{ createdAt: "desc" }];

// Export everyone matching the current audience filters.
export async function GET(request: Request) {
  await requireAdmin();

  const params = new URL(request.url).searchParams;
  const ids = parseIds(params.get("ids"));
  const resolved = resolveVolunteerQuery({
    q: params.get("q") ?? undefined,
    filter: params.get("filter") ?? undefined,
    sort: params.get("sort") ?? undefined,
    programme: params.get("programme") ?? undefined,
    scope: params.get("scope") ?? undefined,
  });

  // A short `?ids=` list is still honoured for convenience/back-compat, but the
  // table posts large hand-picked selections (see POST) to dodge URL limits.
  if (ids) return csvResponse({ id: { in: ids } }, resolved.orderBy, "selected");

  const slug = resolved.programme === "all" ? "all" : resolved.programme;
  return csvResponse(resolved.where, resolved.orderBy, slug);
}

// Export a hand-picked selection. IDs ride in the form body, so a selection of
// any size is safe (a `?ids=` query string of ~200 UUIDs can exceed proxy URL
// limits and be silently rejected).
export async function POST(request: Request) {
  await requireAdmin();

  // Route handlers don't get the framework's Server-Action CSRF mitigation, so
  // guard this state-free download against cross-site form posts: a browser
  // always sends Origin on a POST, and it must match our own host. (Missing
  // Origin → a non-browser API client, which we allow.)
  if (!isSameOrigin(request))
    return new Response("Cross-origin request rejected.", { status: 403 });

  const form = await request.formData();
  const ids = parseIds(form.get("ids")?.toString() ?? null);
  if (!ids)
    return new Response("No volunteers selected.", { status: 400 });

  return csvResponse({ id: { in: ids } }, ID_ORDER, "selected");
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function parseIds(raw: string | null): string[] | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const ids = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : null;
}

async function csvResponse(
  where: Prisma.UserWhereInput,
  orderBy: Prisma.UserOrderByWithRelationInput[],
  slugPart: string,
) {
  const users = await db.user.findMany({
    where,
    orderBy,
    include: {
      _count: {
        select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
      },
      // Match the table's "Last active" exactly: most recent booking on a
      // non-cancelled shift. Without this filter the CSV could show a later
      // date from a booking on a cancelled shift than the coordinator saw.
      bookings: {
        where: { shift: { cancelled: false } },
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

  // Strip anything that isn't filename-safe so a crafted programme slug can't
  // break out of the quoted Content-Disposition value.
  const safeSlug = slugPart.replace(/[^a-z0-9_-]/gi, "-");
  const filename = `volunteers-${safeSlug}-${FILE_STAMP.format(new Date())}.csv`;

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
