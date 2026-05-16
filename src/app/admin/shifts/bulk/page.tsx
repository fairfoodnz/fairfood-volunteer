import Link from "next/link";
import { db } from "@/lib/db";
import { BulkScheduler } from "@/components/admin/bulk-scheduler";

export const metadata = { title: "Bulk schedule · Admin" };
export const dynamic = "force-dynamic";

export default async function BulkSchedulePage() {
  const programmes = await db.program.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      templates: {
        where: { active: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          startTime: true,
          endTime: true,
          capacity: true,
        },
      },
    },
  });

  const hasAnyTemplate = programmes.some((p) => p.templates.length > 0);

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          ← Admin
        </Link>
        <p className="eyebrow mt-4">Bulk schedule</p>
        <h1 className="display mt-2 mb-2 text-3xl font-bold leading-tight md:text-4xl">
          Roll out shifts across a date range
        </h1>
        <p className="mb-8 max-w-2xl text-foreground/70">
          Pick a programme&rsquo;s templates, a date range and the weekdays to
          repeat on. You&rsquo;ll see an exact preview before any shift is
          created. Slots that already exist at the same time are skipped.
        </p>

        {programmes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
            <h2 className="display text-2xl font-semibold">
              No active programmes
            </h2>
            <p className="mt-2 text-foreground/70">
              Add a programme before scheduling shifts.
            </p>
          </div>
        ) : !hasAnyTemplate ? (
          <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
            <h2 className="display text-2xl font-semibold">No templates yet</h2>
            <p className="mt-2 text-foreground/70">
              Add shift templates on a{" "}
              <Link
                href="/admin/programmes"
                className="font-semibold text-leaf-deep hover:underline"
              >
                programme&rsquo;s page
              </Link>{" "}
              to start bulk scheduling.
            </p>
          </div>
        ) : (
          <BulkScheduler programmes={programmes} />
        )}
      </div>
    </div>
  );
}
