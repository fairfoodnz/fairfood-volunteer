import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One labelled form field per MASTER.md: visible label above, optional
 * required asterisk, helper text below, and an error that is announced and
 * wired to the control with aria-describedby / aria-invalid.
 *
 * The single child is the control (Input, Textarea, select…); it is cloned
 * with `id` and the aria attributes, so callers don't wire them by hand.
 */
export function FormField({
  id,
  label,
  required = false,
  optional = false,
  helper,
  error,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  /** Show a quiet "(optional)" after the label. */
  optional?: boolean;
  helper?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = `${id}-error`;
  // Keep any description the control already points at (e.g. a shared
  // helper elsewhere in the form) and add ours.
  const ownDescribedBy = children.props["aria-describedby"] as
    | string
    | undefined;
  const describedBy =
    [ownDescribedBy, helperId, error ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  });

  return (
    <div className={cn("space-y-2", className)}>
      {/* The asterisk sits beside the <label>, not inside it, so the label
          text (what voice control and getByLabel match) is exactly `label`;
          `aria-required` on the control carries the meaning. */}
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required ? (
          <span aria-hidden className="text-sm leading-none text-tomato-deep">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ml-1 text-sm leading-none text-foreground/65">
            (optional)
          </span>
        ) : null}
      </div>
      {control}
      {helper ? (
        <p id={helperId} className="text-xs text-foreground/65">
          {helper}
        </p>
      ) : null}
      {/* Persistent live region: it exists before the error does, so the
          message is announced when it appears. */}
      <p
        id={errorId}
        role="status"
        aria-live="polite"
        className={cn("text-sm text-destructive", !error && "sr-only")}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
