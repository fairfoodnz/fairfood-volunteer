"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ShiftField, ShiftFormState } from "@/app/admin/actions";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProgrammeOption = { slug: string; title: string };

type ShiftFormDefaults = {
  programSlug?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  notes?: string | null;
};

const INITIAL: ShiftFormState = {};

/**
 * Shared shift fields for both the "New shift" and "Edit shift" pages.
 * Datetime values are pre-formatted as NZ wall-clock `YYYY-MM-DDTHH:MM` by the
 * caller. The action returns `{ error, field }` instead of throwing, so the
 * message lands next to the field it's about.
 *
 * Submits through onSubmit rather than `<form action>`: React resets a form
 * after an action-prop submit, which would wipe what the coordinator typed
 * whenever the server sends back an error.
 */
export function ShiftForm({
  programs,
  action,
  submitLabel,
  cancelHref,
  defaults,
  shiftId,
}: {
  programs: ProgrammeOption[];
  action: (prev: ShiftFormState, formData: FormData) => Promise<ShiftFormState>;
  submitLabel: string;
  /** Where "Cancel" goes — the page the coordinator came from. */
  cancelHref: string;
  defaults?: ShiftFormDefaults;
  shiftId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the field the server rejected so keyboard and screen-reader
  // users land on the fix, not back at the top of the page.
  useEffect(() => {
    if (!state.field) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#${state.field}`);
    el?.focus();
  }, [state]);

  const fieldError = (field: ShiftField) =>
    state.field === field ? state.error : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-5 rounded-md border border-border bg-card p-6 md:p-8"
    >
      {shiftId && <input type="hidden" name="shiftId" value={shiftId} />}

      {/* Errors without a field (e.g. the shift was deleted meanwhile). */}
      <div role="alert" aria-live="assertive">
        {state.error && !state.field ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>

      {/* Hand-wired rather than FormField: the label has to point at the
          Select's trigger button, not the Select root. */}
      <div className="space-y-2">
        <Label htmlFor="programSlug">
          Programme
          <span aria-hidden className="text-tomato-deep">
            *
          </span>
        </Label>
        <Select
          name="programSlug"
          required
          defaultValue={defaults?.programSlug ?? programs[0]?.slug}
          items={Object.fromEntries(programs.map((p) => [p.slug, p.title]))}
        >
          <SelectTrigger
            id="programSlug"
            className="w-full"
            aria-invalid={fieldError("programSlug") ? true : undefined}
            aria-describedby="programSlug-error"
          >
            <SelectValue placeholder="Choose a programme" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          id="programSlug-error"
          role="status"
          aria-live="polite"
          className={
            fieldError("programSlug") ? "text-sm text-destructive" : "sr-only"
          }
        >
          {fieldError("programSlug") ?? ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="startsAt"
          label="Starts"
          required
          error={fieldError("startsAt")}
        >
          <Input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaults?.startsAt}
          />
        </FormField>
        <FormField
          id="endsAt"
          label="Ends"
          required
          error={fieldError("endsAt")}
        >
          <Input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaults?.endsAt}
          />
        </FormField>
      </div>

      <FormField
        id="capacity"
        label="Capacity"
        required
        helper="How many volunteers this shift needs."
        error={fieldError("capacity")}
      >
        <Input
          name="capacity"
          type="number"
          min={1}
          max={200}
          defaultValue={defaults?.capacity ?? 8}
          required
        />
      </FormField>

      <FormField id="notes" label="Notes" optional error={fieldError("notes")}>
        <Textarea
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={defaults?.notes ?? undefined}
          placeholder="Anything special about this shift"
        />
      </FormField>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="bg-leaf-deep hover:bg-leaf-ink"
        >
          {pending ? <Loader2 className="motion-safe:animate-spin" /> : null}
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
