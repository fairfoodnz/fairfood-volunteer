/**
 * The volunteer-facing Yes/No radio-card pair, shared by the onboarding
 * questionnaire and the profile editor so a question asked in two places looks
 * and behaves the same in both.
 *
 * Native radios under a styled label rather than a JS-driven control: these
 * forms post through Server Actions and must keep working before hydration.
 */

export function RadioCard({
  name,
  value,
  label,
  defaultChecked,
  required,
  invalid,
  describedBy,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** Ids of the group's helper / error, so each radio announces them. */
  describedBy?: string;
}) {
  return (
    <label className="group flex min-h-11 cursor-pointer items-center rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition-colors has-[input:checked]:border-leaf-deep has-[input:checked]:bg-leaf/5 has-[input:checked]:text-leaf-deep has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-input transition-colors group-has-[input:checked]:border-leaf-deep"
        >
          <span className="block h-2.5 w-2.5 scale-0 rounded-full bg-leaf-deep motion-safe:transition-transform group-has-[input:checked]:scale-100" />
        </span>
        {label}
      </span>
    </label>
  );
}

/** Ids for a Yes/No group's helper and (persistent) error region. */
export function yesNoIds(name: string, hasHelper: boolean) {
  const helperId = hasHelper ? `${name}-helper` : undefined;
  const errorId = `${name}-error`;
  return { helperId, errorId };
}

/**
 * The group's error, in a live region that is always rendered so the message
 * is announced when it appears (matches FormField).
 */
export function YesNoError({ id, error }: { id: string; error?: string }) {
  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={error ? "text-sm text-destructive" : "sr-only"}
    >
      {error ?? ""}
    </p>
  );
}

/** The question as a legend, with the required asterisk FormField uses. */
export function YesNoLegend({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <legend className="text-sm font-medium leading-snug">
      {children}
      {required ? (
        <span aria-hidden className="ml-1 text-tomato-deep">
          *
        </span>
      ) : null}
    </legend>
  );
}

/**
 * A required Yes/No question with no follow-up field. Deliberately separate
 * from the questionnaire's FlagGroup, which adds progressive disclosure for the
 * answers a coordinator has to review: folding the two together would make
 * every caller reason about a branch it doesn't use.
 */
export function YesNoField({
  name,
  legend,
  helper,
  noLabel,
  yesLabel,
  defaultValue,
  error,
  required = true,
}: {
  name: string;
  legend: string;
  helper?: string;
  noLabel: string;
  yesLabel: string;
  defaultValue: "yes" | "no" | "";
  error?: string;
  required?: boolean;
}) {
  const { helperId, errorId } = yesNoIds(name, Boolean(helper));
  const describedBy =
    [helperId, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;
  const radio = {
    name,
    required,
    invalid: Boolean(error),
    describedBy,
  };
  return (
    <fieldset className="space-y-3">
      <YesNoLegend required={required}>{legend}</YesNoLegend>
      {helper && (
        <p id={helperId} className="text-sm text-foreground/65">
          {helper}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <RadioCard
          {...radio}
          value="no"
          label={noLabel}
          defaultChecked={defaultValue === "no"}
        />
        <RadioCard
          {...radio}
          value="yes"
          label={yesLabel}
          defaultChecked={defaultValue === "yes"}
        />
      </div>
      <YesNoError id={errorId} error={error} />
    </fieldset>
  );
}
