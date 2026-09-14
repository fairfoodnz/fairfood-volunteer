"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveProfileAction,
  type ProfileState,
  type ProfileValues,
} from "./actions";

export function ProfileForm({
  email,
  defaults,
  next,
}: {
  email: string;
  defaults: ProfileValues;
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

  useEffect(() => {
    if (state.ok) toast.success("Profile saved.");
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="mt-10 space-y-8" noValidate>
      <Card title="The basics">
        <Field
          label="First name"
          name="firstName"
          defaultValue={v.firstName}
          autoComplete="given-name"
          helper="English alphabet, please. Macrons and accents are fine."
          error={fe.firstName}
          required
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={v.lastName}
          autoComplete="family-name"
          error={fe.lastName}
        />
        <Field label="Email" name="email" value={email} disabled />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={v.phone}
          autoComplete="tel"
          error={fe.phone}
        />
        <Field
          label="Pronouns"
          name="pronouns"
          defaultValue={v.pronouns}
          placeholder="e.g. she/they"
          error={fe.pronouns}
        />
      </Card>

      <Card title="Emergency contact">
        <Field
          label="Name"
          name="emergencyName"
          defaultValue={v.emergencyName}
          error={fe.emergencyName}
        />
        <Field
          label="Phone"
          name="emergencyPhone"
          type="tel"
          defaultValue={v.emergencyPhone}
          error={fe.emergencyPhone}
        />
      </Card>

      <Card title="Access needs">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="accessNeeds">
            Anything we can do to make your shifts easier?
          </Label>
          <Textarea
            id="accessNeeds"
            name="accessNeeds"
            rows={4}
            placeholder="Mobility, sensory, support person, anything else."
            defaultValue={v.accessNeeds}
            aria-invalid={fe.accessNeeds ? true : undefined}
          />
          <Err id="accessNeeds-error">{fe.accessNeeds}</Err>
        </div>
      </Card>

      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="bg-leaf hover:bg-leaf-deep"
        >
          {pending ? "Saving…" : next ? "Save and continue →" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-8">
      <h2 className="display mb-5 text-xl font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  value,
  placeholder,
  autoComplete,
  helper,
  error,
  required,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  autoComplete?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const helperId = helper ? `${name}-helper` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-tomato">*</span>}
      </Label>
      <Input
        id={name}
        // Disabled inputs aren't submitted, so the read-only email never
        // reaches the action.
        name={disabled ? undefined : name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[helperId, errorId].filter(Boolean).join(" ") || undefined}
        className="h-11"
      />
      <Err id={errorId}>{error}</Err>
      {helper && (
        <p id={helperId} className="text-xs text-foreground/55">
          {helper}
        </p>
      )}
    </div>
  );
}

function Err({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" aria-live="polite" className="text-sm text-destructive">
      {children}
    </p>
  );
}
