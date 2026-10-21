"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
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
    <div>
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
          className="w-full text-base font-semibold"
        >
          {pending ? "Verifying…" : "Verify my email"}
        </Button>
      </form>

      <div
        className={
          state.error
            ? "mt-5 space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
            : undefined
        }
      >
        {/* Persistent alert region so the failure is announced. */}
        <FormMessage tone="error" message={state.error} />
        {state.error ? <ResendBlock /> : null}
      </div>
    </div>
  );
}

/** Shown when no token reached the page (truncated/garbled link). */
export function ResendBlock() {
  const [state, formAction, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendVerificationAction, {});

  return (
    <div className="space-y-2">
      {state.sent ? null : (
        <form action={formAction}>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            className="border-leaf-deep/40 text-leaf-deep hover:bg-leaf/10 hover:text-leaf-deep"
          >
            {pending ? "Sending…" : "Resend verification email"}
          </Button>
        </form>
      )}
      {/* Persistent regions: the text is swapped in, so it's announced. */}
      <FormMessage
        tone="success"
        message={
          state.sent
            ? "Sent — check your inbox for a fresh link (give it a minute)."
            : null
        }
      />
      <FormMessage tone="error" message={state.error} className="text-foreground/75">
        <Link
          href="/auth/sign-in"
          className="inline-flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Sign in →
        </Link>
      </FormMessage>
    </div>
  );
}
