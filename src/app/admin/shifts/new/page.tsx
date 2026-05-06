import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createShift } from "../../actions";

export const metadata = { title: "New shift · Admin" };
export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  await requireAdmin();
  const programs = await db.program.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x max-w-2xl">
          <p className="eyebrow">Whakahaere · Admin</p>
          <h1 className="display mt-2 text-3xl font-bold leading-tight">New shift</h1>

          <form action={createShift} className="mt-8 space-y-5 rounded-md border border-border bg-card p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="programSlug">Programme</Label>
              <select
                id="programSlug"
                name="programSlug"
                required
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {programs.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={8}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Anything special about this shift" />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-leaf hover:bg-leaf-deep">
                Create shift
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
