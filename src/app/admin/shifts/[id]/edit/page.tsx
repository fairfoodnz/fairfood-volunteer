import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toNzDateTimeLocal } from "@/lib/schedule";
import { formatShiftRange } from "@/lib/programs";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ShiftForm } from "@/components/admin/shift-form";
import { updateShift } from "../../../actions";

export const metadata = { title: "Edit shift · Admin" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditShiftPage({ params }: Props) {
  const { id } = await params;

  const [shift, schedulablePrograms] = await Promise.all([
    db.shift.findUnique({ where: { id }, include: { program: true } }),
    db.program.findMany({
      where: { visibility: { not: "ARCHIVED" } },
      orderBy: { order: "asc" },
      select: { slug: true, title: true },
    }),
  ]);
  if (!shift) notFound();

  // Keep the shift's current programme selectable even if it's been archived.
  const programs = schedulablePrograms.some((p) => p.slug === shift.program.slug)
    ? schedulablePrograms
    : [
        { slug: shift.program.slug, title: shift.program.title },
        ...schedulablePrograms,
      ];

  const rosterHref = `/admin/shifts/${shift.id}`;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <AdminPageHeader
          back={{ href: rosterHref, label: "Back to roster" }}
          eyebrow="Rosters"
          title="Edit shift"
          description={`${shift.program.title} · currently ${formatShiftRange(shift.startsAt, shift.endsAt)}`}
        />

        <ShiftForm
          programs={programs}
          action={updateShift}
          submitLabel="Save changes"
          cancelHref={rosterHref}
          shiftId={shift.id}
          defaults={{
            programSlug: shift.program.slug,
            startsAt: toNzDateTimeLocal(shift.startsAt),
            endsAt: toNzDateTimeLocal(shift.endsAt),
            capacity: shift.capacity,
            notes: shift.notes,
          }}
        />
      </div>
    </div>
  );
}
