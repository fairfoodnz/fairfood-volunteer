import { db } from "@/lib/db";
import { ShiftForm } from "@/components/admin/shift-form";
import { createShift } from "../../actions";

export const metadata = { title: "New shift · Admin" };
export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  const programs = await db.program.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-6 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">New shift</p>
        <h1 className="display mt-2 text-3xl font-bold leading-tight">
          Add a shift to the roster
        </h1>

        <ShiftForm
          programs={programs}
          action={createShift}
          submitLabel="Create shift"
        />
      </div>
    </div>
  );
}
