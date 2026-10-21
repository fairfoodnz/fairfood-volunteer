"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
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
      <FormField
        id="password"
        label="New password"
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
        label="Confirm new password"
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
          href="/auth/forgot-password"
          className="inline-flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Request a new link →
        </Link>
      </FormMessage>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full text-base font-semibold"
      >
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
