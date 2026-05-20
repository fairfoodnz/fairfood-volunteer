"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
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
        toast.success(hasPassword ? "Password updated." : "Password set.");
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
        className="h-11"
        onClick={() => {
          setState({});
          setOpen(true);
        }}
      >
        {hasPassword ? "Change password" : "Set a password"}
      </Button>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={onSubmit} className="space-y-5" noValidate>
      {hasPassword && (
        <Field
          label="Current password"
          id="currentPassword"
          autoComplete="current-password"
          error={fe.currentPassword}
          required
        />
      )}
      <Field
        label="New password"
        id="newPassword"
        autoComplete="new-password"
        helper="At least 8 characters."
        error={fe.newPassword}
        required
      />
      <Field
        label="Confirm new password"
        id="confirm"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-11 bg-leaf font-semibold text-cream hover:bg-leaf-deep"
        >
          {pending
            ? "Saving…"
            : hasPassword
              ? "Update password"
              : "Set password"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
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
      {hasPassword && (
        <p className="text-xs text-foreground/55">
          Changing your password will sign you out on every other device.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  id,
  autoComplete,
  helper,
  error,
  required,
}: {
  label: string;
  id: string;
  autoComplete?: string;
  helper?: string;
  error?: string;
  required?: boolean;
}) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-tomato">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [helperId, errorId].filter(Boolean).join(" ") || undefined
        }
        className="h-11"
      />
      {helper && !error && (
        <p id={helperId} className="text-xs text-foreground/55">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
