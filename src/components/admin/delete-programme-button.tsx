"use client";

import { deleteProgramme } from "@/app/admin/programmes/actions";

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
  // shifts exist we steer coordinators to the "hide" toggle instead.
  if (shiftCount > 0) {
    return (
      <p className="text-sm text-foreground/65">
        This programme has {shiftCount} shift{shiftCount === 1 ? "" : "s"}, so it
        can’t be deleted. Set its visibility to{" "}
        <span className="font-medium">Hidden</span> above to take it off the
        site without losing the roster history.
      </p>
    );
  }

  return (
    <form
      action={deleteProgramme}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete “${title}” permanently? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-md border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
      >
        Delete programme
      </button>
    </form>
  );
}
