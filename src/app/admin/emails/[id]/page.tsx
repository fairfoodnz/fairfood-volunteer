import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fullName } from "@/lib/users";
import {
  EMAIL_STATUS_BADGE,
  EMAIL_TEMPLATE_LABELS,
  formatEmailTimestamp,
} from "@/lib/email-display";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const row = await db.emailLog.findUnique({
    where: { id },
    select: { subject: true },
  });
  return { title: row ? `${row.subject} · Emails` : "Email · Admin" };
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
  const backLabel = row.user
    ? `← Back to ${fullName(row.user)}`
    : "← All volunteers";

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-foreground"
        >
          {backLabel}
        </Link>

        <header className="mb-8">
          <p className="eyebrow">Email · {EMAIL_TEMPLATE_LABELS[row.template]}</p>
          <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
            {row.subject}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/70">
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
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badge.cls}`}
            >
              {badge.label}
            </span>
          </p>
          {row.providerId && (
            <p className="mt-2 font-mono text-xs text-foreground/55">
              Resend id · {row.providerId}
            </p>
          )}
        </header>

        {row.error && (
          <div className="mb-8 rounded-md border border-tomato/30 bg-tomato/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-tomato">
              Delivery error
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-tomato">
              {row.error}
            </p>
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
              className="block h-[900px] w-full"
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
