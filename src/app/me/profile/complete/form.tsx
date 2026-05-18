"use client";

import { useActionState, useMemo } from "react";
import { format, subYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeardAbout } from "@/generated/prisma";
import {
  completeProfileAction,
  type QuestionnaireState,
} from "./actions";

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
  next,
}: {
  defaults: Defaults;
  next?: string;
}) {
  const [state, action, pending] = useActionState<QuestionnaireState, FormData>(
    completeProfileAction,
    {},
  );
  const fe = state.fieldErrors ?? {};
  // UX guardrails only — the action authoritatively enforces the 13–120 age
  // window (see completeProfileAction). Keep the bounds in lockstep with it.
  const birthdayBounds = useMemo(() => {
    const now = new Date();
    return {
      min: format(subYears(now, 120), "yyyy-MM-dd"),
      max: format(subYears(now, 13), "yyyy-MM-dd"),
    };
  }, []);

  return (
    <form action={action} className="space-y-8" noValidate>
      <FormSection>
        <FieldRow>
          <Label htmlFor="phone">
            Phone <Req />
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="021…"
            defaultValue={defaults.phone}
            aria-invalid={fe.phone ? true : undefined}
            className="h-11"
          />
          <Helper>We&rsquo;ll text you a reminder the day before your shift.</Helper>
          <Err>{fe.phone}</Err>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="birthday">
            Birthday <Req />
          </Label>
          <DatePicker
            id="birthday"
            name="birthday"
            defaultValue={defaults.birthday}
            min={birthdayBounds.min}
            max={birthdayBounds.max}
            captionLayout="dropdown"
            placeholder="Select your birthday"
            aria-invalid={fe.birthday ? true : undefined}
            className="h-11"
          />
          <Helper>Just to check you&rsquo;re 13 or over — that&rsquo;s all we use it for.</Helper>
          <Err>{fe.birthday}</Err>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="heardAbout">
            How did you hear about Fair Food? <Req />
          </Label>
          <select
            id="heardAbout"
            name="heardAbout"
            defaultValue={defaults.heardAbout}
            aria-invalid={fe.heardAbout ? true : undefined}
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Pick one…
            </option>
            {HEARD_ABOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Err>{fe.heardAbout}</Err>

          {/* Revealed when "Somewhere else" is selected. CSS-only via :has() on the wrapping fieldset. */}
          <div className="reveal-other mt-3 hidden">
            <Label htmlFor="heardAboutOther" className="text-sm">
              Tell us more
            </Label>
            <Input
              id="heardAboutOther"
              name="heardAboutOther"
              defaultValue={defaults.heardAboutOther}
              aria-invalid={fe.heardAboutOther ? true : undefined}
              className="mt-2 h-11"
            />
            <Err>{fe.heardAboutOther}</Err>
          </div>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="whyInterested">
            Why are you interested in volunteering at Fair Food? <Req />
          </Label>
          <Textarea
            id="whyInterested"
            name="whyInterested"
            rows={3}
            defaultValue={defaults.whyInterested}
            placeholder="A sentence or two is plenty."
            aria-invalid={fe.whyInterested ? true : undefined}
            className="resize-none"
          />
          <Err>{fe.whyInterested}</Err>
        </FieldRow>
      </FormSection>

      <FormSection>
        <FlagGroup
          name="arrestHistory"
          legend="Have you ever been arrested or incarcerated?"
          helper="Visible only to the volunteer coordinator. Answering yes doesn't disqualify you — we just like to have a chat first."
          followUpName="arrestDetails"
          followUpLabel="Anything you'd like us to share with the coordinator? (optional)"
          defaultValue={defaults.arrestHistory}
          followUpDefault={defaults.arrestDetails}
          error={fe.arrestHistory}
          followUpError={fe.arrestDetails}
        />
        <FlagGroup
          name="healthConditions"
          legend="Do you have any health conditions we should know about?"
          helper="Used only on the day to keep you safe — allergies, mobility needs, anything we should be aware of."
          followUpName="healthDetails"
          followUpLabel="Anything you'd like us to know? (optional)"
          defaultValue={defaults.healthConditions}
          followUpDefault={defaults.healthDetails}
          error={fe.healthConditions}
          followUpError={fe.healthDetails}
        />
      </FormSection>

      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-foreground/55">
          You can edit any of this later from{" "}
          <span className="font-medium">My shifts → Edit profile</span>.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 bg-leaf text-base font-semibold hover:bg-leaf-deep"
        >
          {pending ? "Saving…" : "Save and continue →"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function FieldRow({ children }: { children: React.ReactNode }) {
  // Wrapping <fieldset> + group selector for the heardAbout "other" reveal.
  return (
    <fieldset className="space-y-2 [&:has(select_option[value=OTHER]:checked)_.reveal-other]:!block">
      {children}
    </fieldset>
  );
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
  return (
    <fieldset className="flag-group space-y-3 [&:has(input[value=yes]:checked)_.flag-follow]:!block">
      <legend className="text-sm font-medium leading-snug">{legend}</legend>
      <p className="text-sm text-foreground/65">{helper}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <RadioCard
          name={name}
          value="no"
          label="No"
          defaultChecked={defaultValue === "no"}
        />
        <RadioCard
          name={name}
          value="yes"
          label="Yes"
          defaultChecked={defaultValue === "yes"}
        />
      </div>
      <Err>{error}</Err>
      <div className="flag-follow hidden pt-1">
        <Label htmlFor={followUpName} className="text-sm">
          {followUpLabel}
        </Label>
        <Textarea
          id={followUpName}
          name={followUpName}
          rows={3}
          defaultValue={followUpDefault}
          className="mt-2 resize-none"
          aria-invalid={followUpError ? true : undefined}
        />
        <Err>{followUpError}</Err>
      </div>
    </fieldset>
  );
}

function RadioCard({
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
    <label className="group cursor-pointer rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition-colors has-[input:checked]:border-leaf has-[input:checked]:bg-leaf/5 has-[input:checked]:text-leaf-deep">
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
          className="grid h-5 w-5 place-items-center rounded-full border border-border transition-colors group-has-[input:checked]:border-leaf-deep"
        >
          <span className="block h-2.5 w-2.5 scale-0 rounded-full bg-leaf-deep transition-transform group-has-[input:checked]:scale-100" />
        </span>
        {label}
      </span>
    </label>
  );
}

function Req() {
  return <span className="ml-1 text-tomato">*</span>;
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-foreground/55">{children}</p>;
}

function Err({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" aria-live="polite" className="text-sm text-destructive">
      {children}
    </p>
  );
}
