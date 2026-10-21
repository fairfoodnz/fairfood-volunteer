import { db } from "@/lib/db";
import { fullName } from "@/lib/users";
import { ImportUploader } from "./uploader";
import { PendingInvitesPanel } from "./pending-invites-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatTile } from "@/components/admin/stat-tile";

export const metadata = { title: "Import roster · Admin" };
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
        <AdminPageHeader
          back={{ href: "/admin/volunteers", label: "All volunteers" }}
          eyebrow="Volunteers"
          title="Bring an existing roster across"
          description={
            <>
              Drop in a CSV or .xlsx exported from Apple Numbers, Excel, or
              Google Sheets. We&rsquo;ll match the columns to a Fair Food
              profile, show you what will happen, then create the accounts and
              email each volunteer a one-time link to set their password.
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatTile
            label="Awaiting claim"
            value={totalPending}
            hint={totalPending === 0 ? "No imports outstanding" : "Imported, not yet claimed"}
          />
          <StatTile
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
          <StatTile
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
