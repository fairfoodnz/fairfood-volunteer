import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProgrammeOption = { slug: string; title: string };

type ShiftFormDefaults = {
  programSlug?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  notes?: string | null;
};

/**
 * Shared shift fields for both the "New shift" and "Edit shift" pages. Stays a
 * server component (just markup + a passed-in server action) — datetime values
 * are pre-formatted as NZ wall-clock `YYYY-MM-DDTHH:MM` by the caller.
 */
export function ShiftForm({
  programs,
  action,
  submitLabel,
  defaults,
  shiftId,
}: {
  programs: ProgrammeOption[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: ShiftFormDefaults;
  shiftId?: string;
}) {
  return (
    <form
      action={action}
      className="mt-8 space-y-5 rounded-md border border-border bg-card p-6 md:p-8"
    >
      {shiftId && <input type="hidden" name="shiftId" value={shiftId} />}

      <div className="space-y-2">
        <Label htmlFor="programSlug">Programme</Label>
        <select
          id="programSlug"
          name="programSlug"
          required
          defaultValue={defaults?.programSlug}
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
            defaultValue={defaults?.startsAt}
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
            defaultValue={defaults?.endsAt}
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
          defaultValue={defaults?.capacity ?? 8}
          required
          className="h-11"
        />
        <p className="text-xs text-foreground/55">
          How many volunteers this shift needs.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? undefined}
          placeholder="Anything special about this shift"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-leaf hover:bg-leaf-deep">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
