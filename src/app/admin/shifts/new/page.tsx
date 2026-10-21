import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ShiftForm } from "@/components/admin/shift-form";
import { createShift } from "../../actions";

export const metadata = { title: "New shift · Admin" };
export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  // Archived programmes are the only ones you can't roster new shifts onto.
  const programs = await db.program.findMany({
    where: { visibility: { not: "ARCHIVED" } },
    orderBy: { order: "asc" },
    select: { slug: true, title: true },
  });

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <AdminPageHeader
          back={{ href: "/admin/shifts", label: "Manage shifts" }}
          eyebrow="Rosters"
          title="New shift"
          description="Add a single shift to the roster. To roll out many at once, use Bulk schedule."
        />

        <ShiftForm
          programs={programs}
          action={createShift}
          submitLabel="Create shift"
          cancelHref="/admin/shifts"
        />
      </div>
    </div>
  );
}
