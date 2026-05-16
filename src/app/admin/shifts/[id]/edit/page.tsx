import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toNzDateTimeLocal } from "@/lib/schedule";
import { formatShiftRange } from "@/lib/programs";
import { ShiftForm } from "@/components/admin/shift-form";
import { updateShift } from "../../../actions";

export const metadata = { title: "Edit shift · Admin" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditShiftPage({ params }: Props) {
  const { id } = await params;

  const [shift, activePrograms] = await Promise.all([
    db.shift.findUnique({ where: { id }, include: { program: true } }),
    db.program.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { slug: true, title: true },
    }),
  ]);
  if (!shift) notFound();

  // Keep the shift's current programme selectable even if it's been hidden.
  const programs = activePrograms.some((p) => p.slug === shift.program.slug)
    ? activePrograms
    : [
        { slug: shift.program.slug, title: shift.program.title },
        ...activePrograms,
      ];

  return (
    <div className="px-6 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/admin/shifts/${shift.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-foreground"
        >
          ← Back to roster
        </Link>

        <p className="eyebrow">Edit shift</p>
        <h1 className="display mt-2 text-3xl font-bold leading-tight">
          {shift.program.title}
        </h1>
        <p className="mt-1 text-sm text-foreground/65">
          Currently {formatShiftRange(shift.startsAt, shift.endsAt)}
        </p>

        <ShiftForm
          programs={programs}
          action={updateShift}
          submitLabel="Save changes"
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
