import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        <h1 className="display mt-2 text-3xl font-bold leading-tight">Add a shift to the roster</h1>

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
    </div>
  );
}
