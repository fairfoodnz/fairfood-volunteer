"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Tone = "destructive" | "default";

const CONFIRM_TONE: Record<Tone, string> = {
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  default: "",
};

/**
 * The one confirmation pattern for consequential actions: an alertdialog
 * whose *safe* button has initial focus, a plainly-worded consequence, and a
 * confirm button with pending copy.
 *
 * Two ways to confirm:
 *  - `action` — a Server Action run as a real <form> (hidden `fields` plus
 *    any inputs passed as `children`, e.g. a "notify volunteers" checkbox).
 *    The dialog closes once it resolves.
 *  - `onConfirm` — a client callback (may be async).
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  action,
  fields,
  onConfirm,
  confirmDisabled = false,
  open: controlledOpen,
  onOpenChange,
}: {
  /** Element rendered as the dialog trigger (usually a Button). */
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  action?: (formData: FormData) => unknown | Promise<unknown>;
  fields?: Record<string, string>;
  onConfirm?: () => unknown | Promise<unknown>;
  /** Hold the confirm button disabled (e.g. until "DELETE" is typed). */
  confirmDisabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [pending, startTransition] = React.useTransition();

  const footer = (confirm: React.ReactNode) => (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" autoFocus />}>
        {cancelLabel}
      </DialogClose>
      {confirm}
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent role="alertdialog" showCloseButton={false}>
        <DialogHeader>
          {tone === "destructive" ? (
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <AlertTriangle className="size-5" />
            </span>
          ) : null}
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {action ? (
          <form
            action={async (formData) => {
              await action(formData);
              setOpen(false);
            }}
            className="space-y-4"
          >
            {fields
              ? Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))
              : null}
            {children}
            {footer(
              <FormConfirmButton
                label={confirmLabel}
                pendingLabel={pendingLabel}
                tone={tone}
                disabled={confirmDisabled}
              />,
            )}
          </form>
        ) : (
          <>
            {children}
            {footer(
              <Button
                type="button"
                disabled={pending || confirmDisabled}
                className={cn(CONFIRM_TONE[tone])}
                onClick={() =>
                  startTransition(async () => {
                    await onConfirm?.();
                    setOpen(false);
                  })
                }
              >
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
              </Button>,
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormConfirmButton({
  label,
  pendingLabel,
  tone,
  disabled,
}: {
  label: string;
  pendingLabel?: string;
  tone: Tone;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className={cn(CONFIRM_TONE[tone])}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </Button>
  );
}
