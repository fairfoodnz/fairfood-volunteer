"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  resendVerificationAction,
  verifyEmailAction,
  type ResendVerificationState,
  type VerifyEmailState,
} from "../actions";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    VerifyEmailState,
    FormData
  >(verifyEmailAction, {});

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <p className="text-sm text-foreground/75">
          Tap the button below to confirm{" "}
          <span className="font-medium text-foreground">
            this is your email address
          </span>{" "}
          and finish setting up your account.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
        >
          {pending ? "Verifying…" : "Verify my email"}
        </Button>
      </form>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="space-y-3 rounded-md border border-tomato/30 bg-tomato/5 p-4"
        >
          <p className="text-sm text-destructive">{state.error}</p>
          <ResendBlock />
        </div>
      )}
    </div>
  );
}

/** Shown when no token reached the page (truncated/garbled link). */
export function ResendBlock() {
  const [state, formAction, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendVerificationAction, {});

  if (state.sent) {
    return (
      <p className="text-sm font-medium text-leaf-deep" aria-live="polite">
        Sent — check your inbox for a fresh link (give it a minute).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending}
          className="border-leaf/40 text-leaf-deep hover:bg-leaf/10"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
      </form>
      {state.error && (
        <p className="text-sm text-foreground/75" aria-live="polite">
          {state.error}{" "}
          <Link
            href="/auth/sign-in"
            className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
          >
            Sign in →
          </Link>
        </p>
      )}
    </div>
  );
}
