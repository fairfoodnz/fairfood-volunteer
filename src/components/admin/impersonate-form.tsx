"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  startImpersonationAction,
  type ImpersonateState,
} from "@/app/admin/volunteers/actions";

/**
 * "Impersonate" button on the volunteer detail page. Goes via a Server Action
 * that swaps the admin's session cookie for a short-lived volunteer one, then
 * redirects to /me. A sticky banner mounted in the root layout gives the way
 * back. Errors (target is also admin, etc.) render in-place under the button.
 */
export function ImpersonateForm({
  userId,
  volunteerName,
}: {
  userId: string;
  volunteerName: string;
}) {
  const [state, action, pending] = useActionState<ImpersonateState, FormData>(
    startImpersonationAction,
    {},
  );
  return (
    <form action={action} className="rounded-md border border-border bg-card p-4">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-sm">
        Sign in as <span className="font-semibold">{volunteerName}</span> for
        up to an hour so you can see exactly what they see — useful when
        debugging a booking or a profile issue they&rsquo;ve reported.
      </p>
      <p className="mt-2 text-xs text-foreground/55">
        Any action you take counts as theirs. Every impersonation is logged.
      </p>
      {state.error && (
        <p className="mt-3 rounded-md border border-tomato/40 bg-tomato/5 px-3 py-2 text-xs text-tomato">
          {state.error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Switching…" : "Impersonate volunteer"}
        </Button>
      </div>
    </form>
  );
}
