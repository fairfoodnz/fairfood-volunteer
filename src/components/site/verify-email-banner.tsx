"use client";

import { useActionState } from "react";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
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
            className="mt-0.5 size-5 shrink-0 text-tomato-deep"
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
            {/* Persistent live regions: their text is swapped in, so the
                result of "Resend email" is announced. */}
            <FormMessage
              tone="success"
              message={
                state.sent
                  ? "Fresh link sent — check your inbox (and your spam folder)."
                  : null
              }
            />
            <FormMessage tone="error" message={state.error} />
          </div>
        </div>
        <form action={formAction} className="shrink-0">
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
          >
            {pending ? "Sending…" : "Resend email"}
          </Button>
        </form>
      </div>
    </div>
  );
}
