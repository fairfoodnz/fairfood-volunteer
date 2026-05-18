"use client";

import { useState } from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  beginPasskeyLogin,
  finishPasskeyLogin,
} from "@/app/auth/passkey/actions";

export function PasskeySignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    if (!browserSupportsWebAuthn()) {
      toast.error("This browser doesn't support passkeys.");
      return;
    }
    setPending(true);
    try {
      const begin = await beginPasskeyLogin();
      if (!begin.ok) {
        toast.error(begin.error);
        return;
      }
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: begin.options });
      } catch (err) {
        // Dismissing the OS sheet throws NotAllowedError — stay quiet.
        if ((err as Error)?.name !== "NotAllowedError") {
          toast.error("No passkey was available on this device.");
        }
        return;
      }
      const finish = await finishPasskeyLogin(assertion, next ?? null);
      if (!finish.ok) {
        toast.error(finish.error);
        return;
      }
      // Full navigation so server components re-read the new session.
      window.location.assign(finish.redirectTo);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={signIn}
      disabled={pending}
      className="h-12 w-full gap-3 text-base font-medium"
    >
      <KeyRound aria-hidden className="size-[18px]" />
      {pending ? "Waiting for your device…" : "Sign in with a passkey"}
    </Button>
  );
}
