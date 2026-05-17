"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type SignInState } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInAction,
    {},
  );

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
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-foreground/60 underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-sm text-foreground/65">
        New here?{" "}
        <Link
          href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}
          className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Create an account →
        </Link>
      </p>
    </form>
  );
}
