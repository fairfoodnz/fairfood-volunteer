"use client";

import { useActionState } from "react";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resendVerificationAction,
  type ResendVerificationState,
} from "@/app/auth/actions";

/**
 * Soft-gate nag for unverified volunteers. Rendered by server pages only when
 * `user.emailVerifiedAt` is null, so it self-clears the moment they verify.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendVerificationAction, {});

  return (
    <div className="mb-8 rounded-md border border-tomato/30 bg-tomato/5 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <MailWarning
            className="mt-0.5 size-5 shrink-0 text-tomato"
            aria-hidden
          />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Confirm your email to book shifts
            </p>
            <p className="text-sm text-foreground/75">
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Tap
              it and you&rsquo;re good to go — booking stays locked until then.
            </p>
            {state.sent && (
              <p
                className="text-sm font-medium text-leaf-deep"
                aria-live="polite"
              >
                Fresh link sent — check your inbox (and your spam folder).
              </p>
            )}
            {state.error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {state.error}
              </p>
            )}
          </div>
        </div>
        <form action={formAction} className="shrink-0">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}
            className="border-tomato/40 text-tomato hover:bg-tomato/10 hover:text-tomato"
          >
            {pending ? "Sending…" : "Resend email"}
          </Button>
        </form>
      </div>
    </div>
  );
}
