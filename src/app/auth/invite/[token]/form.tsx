"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { claimInviteAction, type ClaimInviteState } from "@/app/auth/actions";

/**
 * Set-password form for the invite redemption path. Visually mirrors
 * reset-password/form.tsx — same primitives, same field styling — but the
 * action and microcopy frame this as a first-time setup ("Choose your
 * password") rather than a recovery flow.
 */
export function ClaimInviteForm({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
}) {
  const [state, formAction, pending] = useActionState<ClaimInviteState, FormData>(
    claimInviteAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
          Step 1 of 2
        </p>
        <h2 className="display mt-1.5 text-xl font-bold leading-tight">
          Set your password
        </h2>
        <p className="mt-1.5 text-sm text-foreground/65">
          You can change it later from your account settings.
        </p>
      </div>

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

      <FormMessage tone="error" message={state.error}>
        <Link
          href="/auth/sign-in"
          className="inline-flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Go to sign-in →
        </Link>
      </FormMessage>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full text-base font-semibold"
      >
        {pending ? "Setting up…" : `Claim my account${firstName ? `, ${firstName}` : ""} →`}
      </Button>

      <p className="text-xs text-foreground/65">
        After this you&rsquo;ll fill out a short questionnaire so coordinators
        know how to best welcome you on your first shift.
      </p>
    </form>
  );
}
