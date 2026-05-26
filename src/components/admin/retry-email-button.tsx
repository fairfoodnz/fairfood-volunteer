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
 * surface inline as a tomato pill — same pattern as `ImpersonateForm`.
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
        <p className="text-xs text-tomato/85">
          Re-sends the message as it was originally rendered. The retry will
          appear as a new entry in this volunteer&rsquo;s email log.
        </p>
      )}
      <div
        className={
          tone === "block"
            ? "flex items-center gap-3"
            : "inline-flex items-center gap-2"
        }
      >
        <Button
          type="submit"
          size={tone === "block" ? "sm" : "xs"}
          variant="outline"
          disabled={pending}
        >
          {pending ? "Retrying…" : state.ok ? "Retried" : "Retry"}
        </Button>
        {state.error && (
          <span className="rounded-full bg-tomato/15 px-2 py-0.5 text-[10px] font-semibold text-tomato">
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span className="text-[10px] font-semibold text-leaf-deep">
            Sent — new entry added
          </span>
        )}
      </div>
    </form>
  );
}
