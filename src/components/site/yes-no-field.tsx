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
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group cursor-pointer rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition-colors has-[input:checked]:border-leaf has-[input:checked]:bg-leaf/5 has-[input:checked]:text-leaf-deep has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-leaf has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border transition-colors group-has-[input:checked]:border-leaf-deep"
        >
          <span className="block h-2.5 w-2.5 scale-0 rounded-full bg-leaf-deep transition-transform group-has-[input:checked]:scale-100" />
        </span>
        {label}
      </span>
    </label>
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
}: {
  name: string;
  legend: string;
  helper?: string;
  noLabel: string;
  yesLabel: string;
  defaultValue: "yes" | "no" | "";
  error?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-snug">{legend}</legend>
      {helper && <p className="text-sm text-foreground/65">{helper}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <RadioCard
          name={name}
          value="no"
          label={noLabel}
          defaultChecked={defaultValue === "no"}
        />
        <RadioCard
          name={name}
          value="yes"
          label={yesLabel}
          defaultChecked={defaultValue === "yes"}
        />
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
