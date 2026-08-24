import { cn } from "@/lib/utils";
import { programmeVisibilityLabel } from "@/lib/programs";
import type { ProgramVisibility } from "@/generated/prisma";

// Distinct hue per state, but the label always carries the meaning on its own —
// a coordinator scanning the roster should never have to decode a colour.
const TONE: Record<ProgramVisibility, string> = {
  PUBLIC: "bg-leaf/15 text-leaf-deep",
  UNLISTED: "bg-ocean/12 text-ocean",
  PRIVATE: "bg-clay/12 text-clay",
  ARCHIVED: "bg-foreground/10 text-foreground/55",
};

/**
 * Where a programme shows up, at a glance. Rendered anywhere a coordinator
 * might otherwise assume a shift is publicly bookable.
 */
export function ProgrammeVisibilityBadge({
  visibility,
  className,
}: {
  visibility: ProgramVisibility;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONE[visibility],
        className,
      )}
    >
      {programmeVisibilityLabel(visibility)}
    </span>
  );
}
