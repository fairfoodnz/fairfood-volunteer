import Link from "next/link";
import { ProgrammeForm } from "@/components/admin/programme-form";

export const metadata = { title: "New programme · Admin" };

export default function NewProgrammePage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/programmes"
          className="text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          ← Programmes
        </Link>
        <p className="eyebrow mt-4">New programme</p>
        <h1 className="display mt-2 mb-8 text-3xl font-bold leading-tight">
          Add a programme
        </h1>
        <ProgrammeForm />
      </div>
    </div>
  );
}
