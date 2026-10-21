import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fullName } from "@/lib/users";
import { EmailLogStatus } from "@/generated/prisma";
import { RetryEmailButton } from "@/components/admin/retry-email-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  EMAIL_STATUS_BADGE,
  EMAIL_TEMPLATE_LABELS,
  formatEmailTimestamp,
} from "@/lib/email-display";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  // Next calls generateMetadata independently of the page component, so the
  // page's own requireAdmin() doesn't gate this DB query. Guard it explicitly
  // — match the rest of /admin where every server read is admin-gated.
  await requireAdmin();
  const { id } = await params;
  const row = await db.emailLog.findUnique({
    where: { id },
    select: { subject: true },
  });
  return { title: row ? `${row.subject} · Admin` : "Email · Admin" };
}

export default async function EmailDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const row = await db.emailLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
  if (!row) notFound();

  const badge = EMAIL_STATUS_BADGE[row.status];
  // Back-link prefers the volunteer page when we have a User row — that's
  // where the admin came from 99% of the time. Falls back to /admin/volunteers
  // if the user was deleted after the email was sent.
  const backHref = row.user
    ? `/admin/volunteers/${row.user.id}`
    : "/admin/volunteers";
  const backLabel = row.user ? fullName(row.user) : "Volunteers";

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          back={{ href: backHref, label: backLabel }}
          eyebrow={`Volunteers · ${EMAIL_TEMPLATE_LABELS[row.template]} email`}
          title={row.subject}
          description={
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                To{" "}
                {row.user ? (
                  <Link
                    href={`/admin/volunteers/${row.user.id}`}
                    className="font-semibold text-leaf-deep hover:underline"
                  >
                    {row.toEmail}
                  </Link>
                ) : (
                  <span className="font-semibold">{row.toEmail}</span>
                )}
              </span>
              <span>· {formatEmailTimestamp(row.createdAt)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badge.cls}`}
              >
                {badge.label}
              </span>
            </span>
          }
        />
        {row.providerId && (
          <p className="-mt-4 mb-8 break-all font-mono text-xs text-foreground/65">
            Resend id · {row.providerId}
          </p>
        )}

        {row.error && (
          <div className="mb-8 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-destructive">
              Delivery error
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-destructive">
              {row.error}
            </p>
            {row.status === EmailLogStatus.FAILED && (
              <div className="mt-4 border-t border-destructive/20 pt-4">
                <RetryEmailButton emailLogId={row.id} tone="block" />
              </div>
            )}
          </div>
        )}

        <section className="mb-10">
          <h2 className="display mb-3 text-lg font-semibold">Rendered HTML</h2>
          <div className="overflow-hidden rounded-md border border-border bg-white">
            {/*
              Sandbox in two layers: the route's CSP already strips scripts,
              and `sandbox=""` on the iframe (no allow- tokens) blocks JS,
              forms, popups, and same-origin access for defence in depth.
              `referrerPolicy=no-referrer` keeps the admin URL out of any
              image hotlink referrer logs.
            */}
            <iframe
              src={`/admin/emails/${row.id}/preview`}
              title={`Preview: ${row.subject}`}
              className="block h-[min(80vh,900px)] min-h-[28rem] w-full"
              sandbox=""
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        <section>
          <h2 className="display mb-3 text-lg font-semibold">Plain text</h2>
          <pre className="overflow-auto rounded-md border border-border bg-card p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/85">
            {row.bodyText}
          </pre>
        </section>
      </div>
    </div>
  );
}
