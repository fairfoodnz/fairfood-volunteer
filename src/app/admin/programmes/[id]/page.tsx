import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProgrammeForm } from "@/components/admin/programme-form";
import { DeleteProgrammeButton } from "@/components/admin/delete-programme-button";

export const metadata = { title: "Edit programme · Admin" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditProgrammePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;

  const program = await db.program.findUnique({
    where: { id },
    include: { _count: { select: { shifts: true } } },
  });
  if (!program) notFound();

  const { _count, ...record } = program;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/programmes"
          className="text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          ← Programmes
        </Link>
        <p className="eyebrow mt-4">Edit programme</p>
        <h1 className="display mt-2 mb-8 text-3xl font-bold leading-tight">
          {program.title}
        </h1>

        {error === "has-shifts" && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-tomato/40 bg-tomato/10 px-4 py-3 text-sm text-tomato"
          >
            That programme has shifts and can’t be deleted. Set it to{" "}
            <span className="font-medium">Hidden</span> instead.
          </div>
        )}

        <ProgrammeForm program={record} />

        <div className="mt-10 rounded-md border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
            Danger zone
          </h2>
          <p className="mt-1 mb-4 text-sm text-foreground/65">
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
