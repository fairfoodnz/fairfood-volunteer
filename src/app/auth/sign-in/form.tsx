"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { signInAction, type SignInState } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInAction,
    {},
  );
  // React resets the form after every action; remounting on the echoed email
  // re-seeds the uncontrolled input (Base UI ignores a changed defaultValue),
  // so a mistyped password doesn't also cost the volunteer their email. A
  // repeat failure with the same email deliberately doesn't remount: the
  // native form reset restores the defaultValue the last remount seeded.
  const formKey = state.email ?? "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <FormField id="email" label="Email" required>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.email}
        />
      </FormField>
      <div>
        <FormField id="password" label="Password" required>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-11 items-center text-sm font-medium text-leaf-deep underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage tone="error" message={state.error} />
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full text-base font-semibold"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
