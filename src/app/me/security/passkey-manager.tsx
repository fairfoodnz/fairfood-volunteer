"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { toast } from "sonner";
import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  removePasskeyAction,
} from "./actions";

export type PasskeyView = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function PasskeyManager({ passkeys }: { passkeys: PasskeyView[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, startRemoving] = useTransition();

  async function addPasskey() {
    if (!browserSupportsWebAuthn()) {
      toast.error("This browser doesn't support passkeys.");
      return;
    }
    setAdding(true);
    try {
      const begin = await beginPasskeyRegistration();
      if (!begin.ok) {
        toast.error(begin.error);
        return;
      }
      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: begin.options });
      } catch (err) {
        // User dismissed the OS prompt, or no authenticator — not an error.
        if ((err as Error)?.name !== "NotAllowedError") {
          toast.error("Passkey setup was cancelled or unavailable.");
        }
        return;
      }
      const finish = await finishPasskeyRegistration(
        attestation,
        label.trim() || "Passkey",
      );
      if (!finish.ok) {
        toast.error(finish.error ?? "We couldn't register that passkey.");
        return;
      }
      toast.success("Passkey added.");
      setLabel("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Remove the passkey “${name}”? You won't be able to sign in with it anymore.`,
      )
    ) {
      return;
    }
    const data = new FormData();
    data.set("passkeyId", id);
    startRemoving(async () => {
      await removePasskeyAction(data);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {passkeys.length === 0 ? (
        <p className="text-sm text-foreground/65">
          No passkeys yet. Add one to sign in with your fingerprint, face, or
          device PIN — no password to remember.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <KeyRound
                  className="size-5 shrink-0 text-leaf-deep"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{pk.name}</p>
                  <p className="text-xs text-foreground/60">
                    Added {pk.createdAt}
                    {pk.lastUsedAt
                      ? ` · last used ${pk.lastUsedAt}`
                      : " · not used yet"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={removing}
                onClick={() => remove(pk.id, pk.name)}
              >
                <Trash2 aria-hidden />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-md border border-dashed border-leaf/40 bg-leaf/5 p-4">
        <Label htmlFor="passkey-label" className="text-sm font-semibold">
          Add a passkey
        </Label>
        <p className="mt-1 text-xs text-foreground/65">
          Give it a name so you can tell your devices apart.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            id="passkey-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
            placeholder="e.g. My laptop"
            className="h-11 sm:max-w-xs"
          />
          <Button
            type="button"
            onClick={addPasskey}
            disabled={adding}
            className="h-11 bg-leaf hover:bg-leaf-deep"
          >
            {adding ? "Waiting for device…" : "Add passkey"}
          </Button>
        </div>
      </div>
    </div>
  );
}
