"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
          Step 1 of 2
        </p>
        <h2 className="display mt-1.5 text-xl font-bold leading-tight">
          Set your password
        </h2>
        <p className="mt-1.5 text-sm text-foreground/65">
          You can change it later from your account settings.
        </p>
      </div>

      <Field
        label="Password"
        id="password"
        autoComplete="new-password"
        helper="At least 8 characters."
        error={fe.password}
        required
      />
      <Field
        label="Confirm password"
        id="confirm"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />

      {state.error && (
        <div role="alert" aria-live="polite" className="space-y-1">
          <p className="text-sm text-destructive">{state.error}</p>
          <Link
            href="/auth/sign-in"
            className="text-sm font-semibold text-leaf-deep underline-offset-4 hover:underline"
          >
            Go to sign-in →
          </Link>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Setting up…" : `Claim my account${firstName ? `, ${firstName}` : ""} →`}
      </Button>

      <p className="text-xs text-foreground/55">
        After this you&rsquo;ll fill out a short questionnaire so coordinators
        know how to best welcome you on your first shift.
      </p>
    </form>
  );
}

function Field({
  label,
  id,
  autoComplete,
  helper,
  error,
  required,
}: {
  label: string;
  id: string;
  autoComplete?: string;
  helper?: string;
  error?: string;
  required?: boolean;
}) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-tomato">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [helperId, errorId].filter(Boolean).join(" ") || undefined
        }
        className="h-11"
      />
      {helper && !error && (
        <p id={helperId} className="text-xs text-foreground/55">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
