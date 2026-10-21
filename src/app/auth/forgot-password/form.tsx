"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "../actions";

export function ForgotPasswordForm() {
  // Remembered so "Send another link" can resubmit without retyping, and so
  // "Use a different email" brings the form back pre-filled.
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(async (prev, formData) => {
    setEmail(String(formData.get("email") ?? ""));
    setEditing(false);
    return requestPasswordResetAction(prev, formData);
  }, {});

  const sent = Boolean(state.sent) && !editing;

  return (
    <div className="space-y-5">
      {/* Persistent status region. It empties while a send is in flight, so a
          repeat "Send another link" is announced again when it lands. */}
      <FormMessage
        tone="success"
        message={sent && !pending ? "Check your inbox" : null}
        className="text-base font-semibold"
      >
        <p className="text-sm font-normal text-foreground/75">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{email}</span>,
          we&rsquo;ve sent a link to choose a new password. It stays valid for
          24 hours.
        </p>
      </FormMessage>

      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground/70">
            Didn&rsquo;t get it? Check your spam folder, then send another
            link.
          </p>
          <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="email" value={email} />
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Sending…" : "Send another link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              Use a different email
            </Button>
          </form>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <FormField id="email" label="Email" required>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={email}
            />
          </FormField>
          <FormMessage tone="error" message={editing ? null : state.error} />
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full text-base font-semibold"
          >
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
