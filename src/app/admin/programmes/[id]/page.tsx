import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProgrammeForm } from "@/components/admin/programme-form";
import { ProgrammeTemplates } from "@/components/admin/programme-templates";
import { DeleteProgrammeButton } from "@/components/admin/delete-programme-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">) {
  // generateMetadata runs independently of the layout's admin gate.
  await requireAdmin();
  const { id } = await params;
  const program = await db.program.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: program ? `${program.title} · Admin` : "Programme · Admin" };
}

export default async function EditProgrammePage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const program = await db.program.findUnique({
    where: { id },
    include: {
      _count: { select: { shifts: true } },
      templates: { orderBy: [{ order: "asc" }, { startTime: "asc" }] },
    },
  });
  if (!program) notFound();

  const { _count, templates, ...record } = program;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          back={{ href: "/admin/programmes", label: "Programmes" }}
          eyebrow="Programmes"
          title={program.title}
        />

        {error === "has-shifts" && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-tomato/40 bg-tomato/10 px-4 py-3 text-sm text-tomato-deep"
          >
            That programme has shifts and can’t be deleted. Set it to{" "}
            <span className="font-medium">Archived</span> instead.
          </div>
        )}

        <ProgrammeForm program={record} />

        <ProgrammeTemplates
          programId={program.id}
          templates={templates.map((t) => ({
            id: t.id,
            label: t.label,
            startTime: t.startTime,
            endTime: t.endTime,
            capacity: t.capacity,
            notes: t.notes,
            active: t.active,
            order: t.order,
          }))}
        />

        <div className="mt-10 rounded-md border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
            Danger zone
          </h2>
          <p className="mt-1 mb-4 text-sm text-foreground/70">
            Permanently remove this programme.
          </p>
          <DeleteProgrammeButton
            id={program.id}
            title={program.title}
            shiftCount={_count.shifts}
          />
        </div>
      </div>
    </div>
  );
}
