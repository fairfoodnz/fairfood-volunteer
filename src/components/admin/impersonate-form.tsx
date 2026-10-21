"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { startImpersonationAction } from "@/app/admin/volunteers/actions";

/**
 * "Impersonate" on the volunteer detail page. Confirms first — it swaps the
 * admin's session for a short-lived volunteer one — then the Server Action
 * redirects to /me. A sticky banner mounted in the root layout gives the way
 * back. Errors (target is also admin, etc.) are announced under the button.
 */
export function ImpersonateForm({
  userId,
  volunteerName,
}: {
  userId: string;
  volunteerName: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-sm">
        Sign in as <span className="font-semibold">{volunteerName}</span>{" "}
        for up to an hour so you can see exactly what they see — useful when
        debugging a booking or a profile issue they&rsquo;ve reported.
      </p>
      <p className="mt-2 text-xs text-foreground/70">
        Any action you take counts as theirs. Every impersonation is logged.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              Impersonate volunteer
            </Button>
          }
          tone="default"
          title={`Sign in as ${volunteerName}?`}
          description={
            <>
              You&rsquo;ll leave the admin and see the site as {volunteerName}{" "}
              for up to an hour. Anything you book, cancel or edit is done as
              them, and the session is logged. Use &ldquo;Stop
              impersonating&rdquo; in the banner to come back.
            </>
          }
          confirmLabel="Sign in as them"
          pendingLabel="Switching…"
          fields={{ userId }}
          action={async (formData) => {
            setError(null);
            // On success the action redirects to /me and never returns.
            const result = await startImpersonationAction({}, formData);
            if (result?.error) setError(result.error);
          }}
        />
      </div>
    </div>
  );
}
