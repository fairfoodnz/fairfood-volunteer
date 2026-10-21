"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/patterns/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  // Track the "has a password now" bit client-side: `hasPassword` is a frozen
  // prop from the initial server render, and `revalidatePath` won't refresh
  // this Server Component's snapshot until the next navigation. After a
  // successful first-time set we need the button/labels/required fields to
  // flip immediately.
  const [hasPasswordNow, setHasPasswordNow] = useState(hasPassword);
  const [state, setState] = useState<ChangePasswordState>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Wrapping the action lets us run client-only follow-ups (toast, close,
  // reset) only on the success branch — without setState-in-an-effect.
  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePasswordAction(state, formData);
      setState(result);
      if (result.ok) {
        toast.success(hasPasswordNow ? "Password updated." : "Password set.");
        if (!hasPasswordNow) setHasPasswordNow(true);
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setState({});
          setOpen(true);
        }}
      >
        {hasPasswordNow ? "Change password" : "Set a password"}
      </Button>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={onSubmit} className="space-y-5" noValidate>
      {hasPasswordNow && (
        <FormField
          id="currentPassword"
          label="Current password"
          error={fe.currentPassword}
          required
        >
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </FormField>
      )}
      <FormField
        id="newPassword"
        label="New password"
        helper="At least 8 characters."
        error={fe.newPassword}
        required
      >
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        id="confirm"
        label="Confirm new password"
        error={fe.confirm}
        required
      >
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormMessage tone="error" message={state.error} />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="font-semibold"
        >
          {pending
            ? "Saving…"
            : hasPasswordNow
              ? "Update password"
              : "Set password"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            formRef.current?.reset();
            setState({});
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {/* Shown for both "change" and first-time "set": the action revokes
          every other session in either case (a fresh credential should kick
          any lingering Google/passkey-only logins on other devices). */}
      <p className="text-xs text-foreground/65">
        Saving will sign you out on every other device.
      </p>
    </form>
  );
}

