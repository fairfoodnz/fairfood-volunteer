"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateVolunteerNotesAction } from "../actions";

/** Coordinator-only notes on the volunteer profile, with save feedback. */
export function NotesForm({
  userId,
  notes,
}: {
  userId: string;
  notes: string | null;
}) {
  return (
    <form
      action={async (formData) => {
        try {
          await updateVolunteerNotesAction(formData);
          toast.success("Notes saved.");
        } catch {
          toast.error("Couldn't save the notes. Try again.");
        }
      }}
      className="rounded-md border border-border bg-card p-4"
    >
      <input type="hidden" name="userId" value={userId} />
      <label
        htmlFor="notes"
        className="font-mono text-[10px] uppercase tracking-widest text-foreground/70"
      >
        Coordinator notes
      </label>
      <Textarea
        id="notes"
        name="notes"
        rows={6}
        defaultValue={notes ?? ""}
        placeholder="Anything the team should know — visible to admins only."
        className="mt-2"
        maxLength={2000}
        aria-describedby="notes-help"
      />
      <p id="notes-help" className="mt-2 text-xs text-foreground/70">
        Only admins can see this. Keep it factual.
      </p>
      <div className="mt-3 flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 aria-hidden className="motion-safe:animate-spin" />
      ) : null}
      {pending ? "Saving…" : "Save notes"}
    </Button>
  );
}
