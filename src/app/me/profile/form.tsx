"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { Textarea } from "@/components/ui/textarea";
import { YesNoField } from "@/components/site/yes-no-field";
import { useFocusFirstError } from "./focus-first-error";
import {
  saveProfileAction,
  type ProfileState,
  type ProfileValues,
} from "./actions";

export function ProfileForm({
  email,
  defaults,
  copy,
  next,
}: {
  email: string;
  defaults: ProfileValues;
  /** Coordinator-editable wording — see /admin/settings. */
  copy: { firstTimeQuestion: string; firstTimeHelper: string };
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveProfileAction,
    {},
  );
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? defaults;
  // React resets the form after every action; remounting on the values
  // re-seeds the uncontrolled inputs (Base UI ignores a changed defaultValue).
  const formKey = JSON.stringify(v);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.fieldErrors);

  useEffect(() => {
    if (state.ok) toast.success("Profile saved.");
  }, [state]);

  return (
    <form ref={formRef} key={formKey} action={formAction} className="mt-10 space-y-8" noValidate>
      <Card title="The basics">
        <FormField
          id="firstName"
          label="First name"
          helper="English alphabet, please. Macrons and accents are fine."
          error={fe.firstName}
          required
        >
          <Input
            name="firstName"
            defaultValue={v.firstName}
            autoComplete="given-name"
            required
          />
        </FormField>
        <FormField id="lastName" label="Last name" error={fe.lastName}>
          <Input
            name="lastName"
            defaultValue={v.lastName}
            autoComplete="family-name"
          />
        </FormField>
        <FormField id="email" label="Email">
          {/* Disabled inputs aren't submitted, so the read-only email never
              reaches the action. */}
          <Input value={email} disabled />
        </FormField>
        <FormField id="phone" label="Phone" error={fe.phone}>
          <Input
            name="phone"
            type="tel"
            defaultValue={v.phone}
            autoComplete="tel"
          />
        </FormField>
        <FormField id="pronouns" label="Pronouns" error={fe.pronouns}>
          <Input
            name="pronouns"
            defaultValue={v.pronouns}
            placeholder="e.g. she/they"
          />
        </FormField>
      </Card>

      <Card title="Volunteering with us">
        <div className="sm:col-span-2">
          <YesNoField
            name="volunteeredBefore"
            legend={copy.firstTimeQuestion}
            helper={copy.firstTimeHelper}
            noLabel="No, I'm new here"
            yesLabel="Yes, I've been before"
            defaultValue={yesNo(v.volunteeredBefore)}
            error={fe.volunteeredBefore}
            // Optional here (unlike onboarding): see ProfileSchema.
            required={false}
          />
        </div>
      </Card>

      <Card title="Emergency contact">
        <FormField id="emergencyName" label="Name" error={fe.emergencyName}>
          <Input name="emergencyName" defaultValue={v.emergencyName} />
        </FormField>
        <FormField id="emergencyPhone" label="Phone" error={fe.emergencyPhone}>
          <Input
            name="emergencyPhone"
            type="tel"
            defaultValue={v.emergencyPhone}
          />
        </FormField>
      </Card>

      <Card title="Access needs">
        <FormField
          id="accessNeeds"
          label="Anything we can do to make your shifts easier?"
          error={fe.accessNeeds}
          className="sm:col-span-2"
        >
          <Textarea
            name="accessNeeds"
            rows={4}
            placeholder="Mobility, sensory, support person, anything else."
            defaultValue={v.accessNeeds}
          />
        </FormField>
      </Card>

      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full font-semibold sm:w-auto"
        >
          {pending ? "Saving…" : next ? "Save and continue →" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

const yesNo = (value: string): "yes" | "no" | "" =>
  value === "yes" || value === "no" ? value : "";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-8">
      <h2 className="display mb-5 text-xl font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

