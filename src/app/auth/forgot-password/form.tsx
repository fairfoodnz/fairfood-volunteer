"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "../actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(requestPasswordResetAction, {});

  if (state.sent) {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <p className="text-sm font-semibold text-leaf-deep">
          Check your inbox
        </p>
        <p className="text-sm text-foreground/75">
          If an account exists for that email, we&rsquo;ve sent a link to
          choose a new password. It stays valid for 24 hours.
        </p>
        <p className="text-sm text-foreground/60">
          Didn&rsquo;t get it? Check your spam folder, or try again in a few
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11"
        />
      </div>
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
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
