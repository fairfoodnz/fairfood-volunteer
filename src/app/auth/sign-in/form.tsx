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

  if (state.ok) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leaf/15 text-leaf-deep">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 7l9 6 9-6" />
            <rect x="3" y="5" width="18" height="14" rx="2" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="display text-2xl font-semibold">Check your email</h2>
          <p className="text-sm text-foreground/70">
            We&rsquo;ve sent a magic link. Tap it on this device to finish
            signing in.
          </p>
        </div>
        {state.link && (
          <div className="rounded-md border border-dashed border-leaf/40 bg-leaf/5 p-4 text-left text-sm">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-foreground/55">
              Dev only — no email sent
            </p>
            <Link
              href={state.link}
              className="break-all font-mono text-xs text-leaf-deep underline underline-offset-4"
            >
              {state.link}
            </Link>
          </div>
        )}
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
      <div className="space-y-2">
        <Label htmlFor="name">
          Your name <span className="text-foreground/50">(if first time)</span>
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="e.g. Aroha Williams"
          className="h-11"
        />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Sending magic link…" : "Email me a magic link"}
      </Button>
      <p className="text-xs text-foreground/55">
        By signing in you agree to be a kind kaiāwhina at the kai table. We
        only use your details to roster shifts.
      </p>
    </form>
  );
}
