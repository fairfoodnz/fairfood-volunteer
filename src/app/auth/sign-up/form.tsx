"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type SignUpState } from "../actions";

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    signUpAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field
        label="Your name"
        id="name"
        autoComplete="name"
        placeholder="e.g. Aroha Williams"
        error={fe.name}
        required
      />
      <Field
        label="Email"
        id="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={fe.email}
        required
      />
      <Field
        label="Password"
        id="password"
        type="password"
        autoComplete="new-password"
        helper="At least 8 characters."
        error={fe.password}
        required
      />
      <Field
        label="Confirm password"
        id="confirm"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-xs text-foreground/55">
        By creating an account you agree to be a kind kaiāwhina at the kai
        table. We use your details only to roster shifts.
      </p>
    </form>
  );
}

function Field({
  label,
  id,
  type = "text",
  autoComplete,
  placeholder,
  helper,
  error,
  required,
}: {
  label: string;
  id: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
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
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[helperId, errorId].filter(Boolean).join(" ") || undefined}
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
