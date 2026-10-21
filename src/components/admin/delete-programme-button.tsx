"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { deleteProgramme } from "@/app/admin/programmes/actions";
import { countOf } from "@/lib/format";

export function DeleteProgrammeButton({
  id,
  title,
  shiftCount,
}: {
  id: string;
  title: string;
  shiftCount: number;
}) {
  // Deleting cascades to every shift and booking under the programme, so when
  // shifts exist we steer coordinators to Archived instead.
  if (shiftCount > 0) {
    return (
      <p className="text-sm text-foreground/70">
        This programme has {countOf(shiftCount, "shift")}, so it can’t be
        deleted. Set its visibility to{" "}
        <span className="font-medium">Archived</span> above to take it off the
        site and out of the scheduling pickers without losing the roster
        history.
      </p>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Delete programme
        </Button>
      }
      title={`Delete “${title}” permanently?`}
      description="The programme, its page and its shift templates are removed for good. This can’t be undone."
      confirmLabel="Delete programme"
      pendingLabel="Deleting…"
      action={deleteProgramme}
      fields={{ id }}
    />
  );
}
