"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type TemplateFormState,
} from "@/app/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { StatusPill } from "@/components/patterns/status-pill";
import { formatTime12, plural } from "@/lib/format";

export type TemplateRecord = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  active: boolean;
  order: number;
};

const INITIAL: TemplateFormState = {};

export function ProgrammeTemplates({
  programId,
  templates,
}: {
  programId: string;
  templates: TemplateRecord[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section
      id="shift-templates"
      className="mt-10 scroll-mt-20 rounded-md border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="display text-xl font-semibold">Shift templates</h2>
          <p className="mt-1 text-sm text-foreground/65">
            The typical shifts for this programme. Use{" "}
            <span className="font-medium">Bulk schedule</span> to roll them out
            across a date range.
          </p>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            <Plus className="size-4" />
            Add template
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-5">
          <TemplateEditor
            programId={programId}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <div className="mt-5">
        {templates.length === 0 && !adding ? (
          <div className="rounded-md border border-dashed border-border px-5 py-8 text-center text-sm text-foreground/70">
            No templates yet. Add one to start bulk scheduling.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {templates.map((t) =>
              editingId === t.id ? (
                <li key={t.id} className="bg-cream-deep/40 p-4">
                  <TemplateEditor
                    programId={programId}
                    template={t}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={t.id}
                  className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.label}</span>
                      {!t.active && (
                        <StatusPill tone="neutral">Inactive</StatusPill>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/70">
                      {formatTime12(t.startTime)} – {formatTime12(t.endTime)} ·{" "}
                      {t.capacity} {plural(t.capacity, "spot")}
                    </p>
                    {t.notes && (
                      <p className="mt-1 text-sm italic text-foreground/65">
                        {t.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setEditingId(t.id);
                        setAdding(false);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <DeleteTemplateButton id={t.id} label={t.label} />
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function TemplateEditor({
  programId,
  template,
  onDone,
  onCancel,
}: {
  programId: string;
  template?: TemplateRecord;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(template);
  const router = useRouter();
  const [active, setActive] = useState(template?.active ?? true);

  const [state, formAction, pending] = useActionState(
    async (prev: TemplateFormState, fd: FormData) => {
      const result = isEdit
        ? await updateTemplate(prev, fd)
        : await createTemplate(prev, fd);
      if (result.ok) {
        toast.success(isEdit ? "Template updated." : "Template added.");
        router.refresh();
        onDone();
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="programId" value={programId} />
      {isEdit && <input type="hidden" name="id" value={template!.id} />}
      {active && <input type="hidden" name="active" value="1" />}

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Template name</Label>
        <Input
          id="label"
          name="label"
          required
          maxLength={80}
          defaultValue={template?.label ?? ""}
          placeholder="Morning pack"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Starts</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={template?.startTime ?? "09:00"}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Ends</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue={template?.endTime ?? "12:00"}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            required
            defaultValue={template?.capacity ?? 8}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={template?.notes ?? ""}
          placeholder="Carried onto every shift made from this template."
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-11 items-center gap-2.5 rounded-md border border-border px-3 text-sm">
          <Checkbox
            checked={active}
            onCheckedChange={(v) => setActive(Boolean(v))}
          />
          <span>{active ? "Available for scheduling" : "Inactive"}</span>
        </label>
        <input
          type="hidden"
          name="order"
          value={template?.order ?? 0}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={pending}
            onClick={onCancel}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="bg-leaf-deep hover:bg-leaf-ink"
          >
            {pending
              ? "Saving…"
              : isEdit
                ? "Save template"
                : "Add template"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DeleteTemplateButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 aria-hidden className="size-3.5" />
          Delete
          <span className="sr-only"> {label}</span>
        </Button>
      }
      title={`Delete the “${label}” template?`}
      description="Future bulk schedules won’t offer it. Shifts already made from it stay exactly as they are."
      confirmLabel="Delete template"
      pendingLabel="Deleting…"
      fields={{ id }}
      action={async (fd) => {
        try {
          await deleteTemplate(fd);
          toast.success("Template deleted.");
          router.refresh();
        } catch {
          toast.error("Couldn't delete that template. Try again.");
        }
      }}
    />
  );
}
