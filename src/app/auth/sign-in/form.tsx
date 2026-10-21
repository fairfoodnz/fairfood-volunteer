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

  return (
    <form action={formAction} className="space-y-5">
      <FormField id="email" label="Email" required>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
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
