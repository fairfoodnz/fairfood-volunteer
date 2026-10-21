"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { disconnectGoogleAction } from "./actions";

/**
 * "Disconnect Google" behind a confirmation. The action itself refuses to
 * remove the last sign-in method, so the dialog only has to state the
 * consequence.
 */
export function DisconnectGoogleButton() {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="destructive">
          Disconnect Google
        </Button>
      }
      title="Disconnect Google?"
      description="You won’t be able to sign in with Google any more. Your other sign-in methods keep working, and you can reconnect Google at any time."
      confirmLabel="Disconnect Google"
      pendingLabel="Disconnecting…"
      action={disconnectGoogleAction}
    />
  );
}
