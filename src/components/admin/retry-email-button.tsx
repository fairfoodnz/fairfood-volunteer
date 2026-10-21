"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  retryEmailAction,
  type RetryEmailState,
} from "@/app/admin/emails/actions";

/**
 * "Retry" button for a FAILED EmailLog row. Re-sends the stored body via
 * Resend; the action writes a new EmailLog row for the attempt and
 * revalidates the surrounding admin paths, so the resulting send shows up
 * in the list without a full reload. Errors (rate limit, invalid recipient)
 * surface inline and are announced (role="alert").
 *
 * `tone="compact"` is the slim inline variant used in the volunteer email
 * list (just the button + the error). `tone="block"` adds the explanatory
 * paragraph used on the standalone email detail page.
 */
export function RetryEmailButton({
  emailLogId,
  tone = "compact",
}: {
  emailLogId: string;
  tone?: "compact" | "block";
}) {
  const [state, action, pending] = useActionState<RetryEmailState, FormData>(
    retryEmailAction,
    {},
  );
  return (
    <form action={action} className={tone === "block" ? "space-y-3" : ""}>
      <input type="hidden" name="emailLogId" value={emailLogId} />
      {tone === "block" && (
        <p className="text-sm text-foreground/70">
          Re-sends the message as it was originally rendered. The retry will
          appear as a new entry in this volunteer&rsquo;s email log.
        </p>
      )}
      <div
        className={
          tone === "block"
            ? "flex flex-wrap items-center gap-3"
            : "inline-flex flex-wrap items-center gap-2"
        }
      >
        <Button
          type="submit"
          size={tone === "block" ? "default" : "sm"}
          variant="outline"
          disabled={pending}
        >
          {pending ? "Retrying…" : state.ok ? "Retried" : "Retry"}
        </Button>
        {state.error && (
          <span role="alert" className="text-sm text-destructive">
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span role="status" className="text-sm font-semibold text-leaf-deep">
            Sent. A new entry was added to the log.
          </span>
        )}
      </div>
    </form>
  );
}
