import { ProgrammeForm } from "@/components/admin/programme-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "New programme · Admin" };

export default async function NewProgrammePage() {
  await requireAdmin();
  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          back={{ href: "/admin/programmes", label: "Programmes" }}
          eyebrow="Programmes"
          title="Add a programme"
        />
        <ProgrammeForm />
      </div>
    </div>
  );
}
