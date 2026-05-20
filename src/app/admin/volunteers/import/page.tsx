import Link from "next/link";
import { ArrowLeft, Mail, Users2, MailCheck } from "lucide-react";
import { db } from "@/lib/db";
import { fullName } from "@/lib/users";
import { ImportUploader } from "./uploader";
import { PendingInvitesPanel } from "./pending-invites-panel";

export const metadata = { title: "Import volunteers · Admin" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function ImportVolunteersPage() {
  // Anyone whose `importedAt` is still set hasn't claimed yet. Active = has a
  // live, unredeemed invite. Stale = imported but no live invite — likely
  // never had one sent, or token already expired (7d TTL).
  const now = new Date();
  const pending = await db.user.findMany({
    where: { importedAt: { not: null } },
    orderBy: [{ importedAt: "desc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      importedAt: true,
      invites: {
        where: { usedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, expiresAt: true },
      },
    },
  });

  const totalPending = pending.length;
  const activeInvites = pending.filter(
    (u) => u.invites[0] && u.invites[0].expiresAt > now,
  ).length;
  const neverSent = pending.filter((u) => u.invites.length === 0).length;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/admin/volunteers"
            className="inline-flex items-center gap-1.5 text-xs text-foreground/55 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to volunteers
          </Link>
          <p className="eyebrow mt-4">Volunteers · Import</p>
          <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Bring an existing roster across.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Drop in a CSV or .xlsx exported from Apple Numbers, Excel, or
            Google Sheets. We&rsquo;ll match the columns to a Fair Food profile,
            show you what will happen, then create the accounts and email each
            volunteer a one-time link to set their password.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            icon={Users2}
            label="Awaiting claim"
            value={totalPending}
            hint={totalPending === 0 ? "No imports outstanding" : "Imported, not yet claimed"}
          />
          <Stat
            icon={MailCheck}
            label="Active invites"
            value={activeInvites}
            hint={
              activeInvites === 0 && totalPending > 0
                ? "Send invites below"
                : activeInvites > 0
                  ? "Link still valid (≤7 days)"
                  : "Nothing in flight"
            }
          />
          <Stat
            icon={Mail}
            label="Never invited"
            value={neverSent}
            hint={neverSent > 0 ? "Imported but no email sent yet" : "All sent"}
          />
        </div>

        <ImportUploader />

        <PendingInvitesPanel
          rows={pending.map((u) => {
            const live = u.invites[0];
            return {
              id: u.id,
              fullName: fullName(u),
              email: u.email,
              phone: u.phone,
              importedAt: u.importedAt ? NZ_DATE.format(u.importedAt) : null,
              inviteState: !live
                ? ("never" as const)
                : live.expiresAt > now
                  ? ("active" as const)
                  : ("expired" as const),
              inviteSentAt: live ? NZ_DATE.format(live.createdAt) : null,
            };
          })}
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-foreground/55" />}
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
          {label}
        </p>
      </div>
      <p className="display mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-foreground/55">{hint}</p>}
    </div>
  );
}
