import { Check } from "lucide-react";

/**
 * "This is my first time volunteering with Fair Food", on the booking forms.
 *
 * Only shown to volunteers we've never put the question to — accounts that
 * finished the questionnaire before it existed, and who have no attended shift
 * on record. Everyone else answered it at sign-up, so asking again on every
 * booking would be noise.
 *
 * Unticked is not treated as "no": the booking actions only ever write the
 * "I'm new" answer from a tick, never infer the opposite from silence.
 */
export function FirstTimeCheckbox({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition-colors has-[input:checked]:border-leaf has-[input:checked]:bg-leaf/5 has-[input:checked]:text-leaf-deep has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-leaf has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background ${className ?? ""}`}
    >
      <input type="checkbox" name="firstTime" value="yes" className="sr-only" />
      <span
        aria-hidden
        className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border border-border transition-colors group-has-[input:checked]:border-leaf-deep group-has-[input:checked]:bg-leaf-deep"
      >
        <Check
          className="h-3 w-3 scale-0 text-cream transition-transform group-has-[input:checked]:scale-100"
          strokeWidth={3}
        />
      </span>
      <span className="leading-snug">{label}</span>
    </label>
  );
}
