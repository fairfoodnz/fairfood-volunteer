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

/** "09:00" → "9:00 AM". Hours are wall-clock NZ, no timezone involved. */
function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

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
    <section className="mt-10 rounded-md border border-border bg-card p-6">
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
          <div className="rounded-md border border-dashed border-border px-5 py-8 text-center text-sm text-foreground/65">
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
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/70">
                      {formatTime12(t.startTime)} – {formatTime12(t.endTime)} ·{" "}
                      {t.capacity}{" "}
                      {t.capacity === 1 ? "spot" : "spots"}
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
          className="rounded-md border border-tomato/40 bg-tomato/10 px-3 py-2 text-sm text-tomato"
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
            className="bg-leaf hover:bg-leaf-deep"
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
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form
        action={async (fd) => {
          await deleteTemplate(fd);
          toast.success("Template deleted.");
          router.refresh();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="id" value={id} />
        <span className="text-xs text-foreground/65">Delete “{label}”?</span>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-xs text-tomato hover:bg-tomato/10 hover:text-tomato"
        >
          Yes, delete
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setConfirming(false)}
        >
          Keep
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-tomato hover:bg-tomato/10 hover:text-tomato"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  );
}
