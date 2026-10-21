"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { signUpAction, type SignUpState } from "../actions";

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    signUpAction,
    {},
  );
  const fe = state.fieldErrors ?? {};
  // React resets the form after every action; remounting on the echoed values
  // re-seeds the uncontrolled inputs (Base UI ignores a changed defaultValue).
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
            defaultValue={state.values?.firstName}
            required
          />
        </FormField>
        <FormField id="lastName" label="Last name" error={fe.lastName}>
          <Input
            name="lastName"
            autoComplete="family-name"
            placeholder="e.g. Williams"
            defaultValue={state.values?.lastName}
          />
        </FormField>
      </div>
      <FormField id="email" label="Email" error={fe.email} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        helper="At least 8 characters."
        error={fe.password}
        required
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        id="confirm"
        label="Confirm password"
        error={fe.confirm}
        required
      >
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage tone="error" message={state.error} />
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full text-base font-semibold"
      >
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-xs text-foreground/65">
        By creating an account you agree to be a kind kaiāwhina at the kai
        table. We use your details only to roster shifts.
      </p>
    </form>
  );
}
