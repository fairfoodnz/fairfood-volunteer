"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { format, subYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HeardAbout } from "@/generated/prisma";
import {
  RadioCard,
  YesNoError,
  YesNoField,
  YesNoLegend,
  yesNoIds,
} from "@/components/site/yes-no-field";
import { FormField } from "@/components/patterns/form-field";
import { cn } from "@/lib/utils";
import { useFocusFirstError } from "../focus-first-error";
import {
  completeProfileAction,
  type QuestionnaireState,
} from "./actions";

const yesNo = (v: string): "yes" | "no" | "" =>
  v === "yes" || v === "no" ? v : "";

const HEARD_ABOUT_OPTIONS: { value: HeardAbout; label: string }[] = [
  { value: HeardAbout.FRIEND, label: "A friend or whānau" },
  { value: HeardAbout.SOCIAL, label: "Social media" },
  { value: HeardAbout.SEARCH, label: "Google search" },
  { value: HeardAbout.WORKPLACE, label: "Through my workplace" },
  { value: HeardAbout.EVENT, label: "At an event" },
  { value: HeardAbout.OTHER, label: "Somewhere else" },
];

type Defaults = {
  phone: string;
  birthday: string;
  volunteeredBefore: "yes" | "no" | "";
  heardAbout: HeardAbout | "";
  heardAboutOther: string;
  whyInterested: string;
  arrestHistory: "yes" | "no" | "";
  arrestDetails: string;
  healthConditions: "yes" | "no" | "";
  healthDetails: string;
};

export function QuestionnaireForm({
  defaults,
  copy,
  name,
  next,
}: {
  defaults: Defaults;
  /** Coordinator-editable wording — see /admin/settings. */
  copy: { firstTimeQuestion: string; firstTimeHelper: string };
  /** Present only when the stored name isn't in English letters yet. */
  name?: { firstName: string; lastName: string };
  next?: string;
}) {
  const [state, action, pending] = useActionState<QuestionnaireState, FormData>(
    completeProfileAction,
    {},
  );
  const fe = state.fieldErrors ?? {};
  // React resets the form after every action, so a failed submit re-seeds the
  // uncontrolled fields from what was sent (remounting via `key`, since Base UI
  // ignores a changed defaultValue) instead of wiping every answer.
  const d = state.values ?? { ...defaults, firstName: "", lastName: "", ...name };
  const formKey = state.values ? JSON.stringify(state.values) : "initial";
  // Seeded once from `defaults` on purpose. This state lives in this component,
  // not under the keyed <form>, so a failed submit's remount doesn't reset it:
  // the controlled Select and the "Tell us more" field keep the volunteer's pick.
  const [heardAbout, setHeardAbout] = useState<HeardAbout | "">(
    defaults.heardAbout,
  );
  // UX guardrails only — the action authoritatively enforces the 13–120 age
  // window (see completeProfileAction). Keep the bounds in lockstep with it.
  const birthdayBounds = useMemo(() => {
    const now = new Date();
    return {
      min: format(subYears(now, 120), "yyyy-MM-dd"),
      max: format(subYears(now, 13), "yyyy-MM-dd"),
    };
  }, []);

  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.fieldErrors);

  return (
    <form
      ref={formRef}
      key={formKey}
      action={action}
      className="space-y-8"
      noValidate
    >
      {name && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            id="firstName"
            label="First name"
            helper="English alphabet, please. Macrons and accents are fine."
            error={fe.firstName}
            required
          >
            <Input
              name="firstName"
              autoComplete="given-name"
              placeholder="e.g. Aroha"
              defaultValue={d.firstName}
              required
            />
          </FormField>
          <FormField id="lastName" label="Last name" error={fe.lastName}>
            <Input
              name="lastName"
              autoComplete="family-name"
              placeholder="e.g. Williams"
              defaultValue={d.lastName}
            />
          </FormField>
        </div>
      )}

      <FormSection>
        <FormField
          id="phone"
          label="Phone"
          helper="So the team can reach you on the day if plans change. Shift reminders come by email."
          error={fe.phone}
          required
        >
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="021…"
            defaultValue={d.phone}
            required
          />
        </FormField>

        <FormField
          id="birthday"
          label="Birthday"
          helper="Just to check you’re 13 or over — that’s all we use it for."
          error={fe.birthday}
          required
        >
          <DatePicker
            name="birthday"
            defaultValue={d.birthday}
            min={birthdayBounds.min}
            max={birthdayBounds.max}
            captionLayout="dropdown"
            placeholder="Select your birthday"
          />
        </FormField>

        <YesNoField
          name="volunteeredBefore"
          legend={copy.firstTimeQuestion}
          helper={copy.firstTimeHelper}
          noLabel="No, this'll be my first time"
          yesLabel="Yes, I've been before"
          defaultValue={yesNo(d.volunteeredBefore)}
          error={fe.volunteeredBefore}
        />

        {/* Hand-wired rather than FormField: the control FormField would
            clone is the Select root, which renders no element of its own. */}
        <div className="space-y-2">
          <Label htmlFor="heardAbout">
            How did you hear about Fair Food?
            <span aria-hidden className="text-tomato-deep">
              *
            </span>
          </Label>
          <Select
            name="heardAbout"
            value={heardAbout === "" ? null : heardAbout}
            onValueChange={(v) =>
              setHeardAbout((v ?? "") as HeardAbout | "")
            }
            items={Object.fromEntries(
              HEARD_ABOUT_OPTIONS.map((opt) => [opt.value, opt.label]),
            )}
          >
            <SelectTrigger
              id="heardAbout"
              className="w-full"
              aria-required
              aria-invalid={fe.heardAbout ? true : undefined}
              aria-describedby={fe.heardAbout ? "heardAbout-error" : undefined}
            >
              <SelectValue placeholder="Pick one…" />
            </SelectTrigger>
            <SelectContent>
              {HEARD_ABOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p
            id="heardAbout-error"
            role="status"
            aria-live="polite"
            className={fe.heardAbout ? "text-sm text-destructive" : "sr-only"}
          >
            {fe.heardAbout ?? ""}
          </p>

          {heardAbout === HeardAbout.OTHER && (
            <FormField
              id="heardAboutOther"
              label="Tell us more"
              error={fe.heardAboutOther}
              required
              className="pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
            >
              <Input
                name="heardAboutOther"
                defaultValue={d.heardAboutOther}
                required
              />
            </FormField>
          )}
        </div>

        <FormField
          id="whyInterested"
          label="Why are you interested in volunteering at Fair Food?"
          error={fe.whyInterested}
          required
        >
          <Textarea
            name="whyInterested"
            rows={3}
            defaultValue={d.whyInterested}
            placeholder="A sentence or two is plenty."
            className="resize-none"
            required
          />
        </FormField>
      </FormSection>

      <FormSection>
        <FlagGroup
          name="arrestHistory"
          legend="Have you ever been arrested or incarcerated?"
          helper="Visible only to the volunteer coordinator. Answering yes doesn't disqualify you — we just like to have a chat first."
          followUpName="arrestDetails"
          followUpLabel="Anything you'd like us to share with the coordinator?"
          defaultValue={yesNo(d.arrestHistory)}
          followUpDefault={d.arrestDetails}
          error={fe.arrestHistory}
          followUpError={fe.arrestDetails}
        />
        <FlagGroup
          name="healthConditions"
          legend="Do you have any health conditions we should know about?"
          helper="Used only on the day to keep you safe — allergies, mobility needs, anything we should be aware of."
          followUpName="healthDetails"
          followUpLabel="Anything you'd like us to know?"
          defaultValue={yesNo(d.healthConditions)}
          followUpDefault={d.healthDetails}
          error={fe.healthConditions}
          followUpError={fe.healthDetails}
        />
      </FormSection>

      {next && <input type="hidden" name="next" value={next} />}

      {/* Sticky on phones so the submit is always in reach on a long form;
          it settles into place at the end of the card. The negative margins
          bleed it to the card's edges (the card is p-6 below md). */}
      <EditLaterNote className="md:hidden" />
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-border bg-card px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:mb-0 md:flex md:items-center md:justify-between md:gap-3 md:px-0 md:pt-6 md:pb-0">
        {/* Kept out of the sticky bar on phones so it stays one button tall. */}
        <EditLaterNote className="hidden md:block" />
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full text-base font-semibold md:w-auto"
        >
          {pending ? "Saving…" : "Save and continue →"}
        </Button>
      </div>
    </form>
  );
}

function EditLaterNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-foreground/65", className)}>
      You can edit any of this later from{" "}
      <span className="font-medium">My shifts → Edit profile</span>.
    </p>
  );
}

function FormSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function FlagGroup({
  name,
  legend,
  helper,
  followUpName,
  followUpLabel,
  defaultValue,
  followUpDefault,
  error,
  followUpError,
}: {
  name: string;
  legend: string;
  helper: string;
  followUpName: string;
  followUpLabel: string;
  defaultValue: "yes" | "no" | "";
  followUpDefault: string;
  error?: string;
  followUpError?: string;
}) {
  const { helperId, errorId } = yesNoIds(name, true);
  const radio = {
    name,
    required: true,
    invalid: Boolean(error),
    describedBy: [helperId, error ? errorId : undefined]
      .filter(Boolean)
      .join(" "),
  };
  return (
    <fieldset className="flag-group space-y-3 [&:has(input[value=yes]:checked)_.flag-follow]:!block">
      <YesNoLegend required>{legend}</YesNoLegend>
      <p id={helperId} className="text-sm text-foreground/65">
        {helper}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <RadioCard
          {...radio}
          value="no"
          label="No"
          defaultChecked={defaultValue === "no"}
        />
        <RadioCard
          {...radio}
          value="yes"
          label="Yes"
          defaultChecked={defaultValue === "yes"}
        />
      </div>
      <YesNoError id={errorId} error={error} />
      <div className="flag-follow hidden pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200">
        <FormField
          id={followUpName}
          label={followUpLabel}
          error={followUpError}
          optional
        >
          <Textarea
            name={followUpName}
            rows={3}
            defaultValue={followUpDefault}
            className="resize-none"
          />
        </FormField>
      </div>
    </fieldset>
  );
}
