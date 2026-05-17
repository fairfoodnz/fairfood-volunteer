"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ResetPasswordState } from "../actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    ResetPasswordState,
    FormData
  >(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        id="password"
        autoComplete="new-password"
        helper="At least 8 characters."
        error={fe.password}
        required
      />
      <Field
        label="Confirm new password"
        id="confirm"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      {state.error && (
        <div role="alert" aria-live="polite" className="space-y-1">
          <p className="text-sm text-destructive">{state.error}</p>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-semibold text-leaf-deep underline-offset-4 hover:underline"
          >
            Request a new link →
          </Link>
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Saving…" : "Set new password"}
      </Button>
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
