"use client";

import { useActionState, useState } from "react";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { StatusPill, type PillTone } from "@/components/patterns/status-pill";
import {
  ALLOWED_MIME_TYPES,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MAX_UPLOAD_BYTES,
  VISIBILITY_LABELS,
  VISIBILITY_ORDER,
  formatBytes,
} from "@/lib/documents";
import {
  deleteDocumentAction,
  updateDocumentAction,
  type EditDocumentState,
} from "@/app/admin/documents/actions";
import type { DocumentCategory, DocumentVisibility } from "@/generated/prisma";

export type DocumentRowProps = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
};

// Who can open the file, at a glance. The label carries the meaning.
const AUDIENCE: Record<DocumentVisibility, { label: string; tone: PillTone }> =
  {
    PUBLIC: { label: "Public", tone: "positive" },
    VOLUNTEER: { label: "Volunteers", tone: "neutral" },
    ADMIN: { label: "Admins only", tone: "info" },
  };

const ROW_ACTION =
  "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40";

export function DocumentRow(props: DocumentRowProps) {
  const audience = AUDIENCE[props.visibility];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {props.title}
          </p>
          <StatusPill tone={audience.tone}>{audience.label}</StatusPill>
        </div>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-foreground/70">
          {shortType(props.mimeType)} · {formatBytes(props.sizeBytes)} ·{" "}
          {props.createdAt}
        </p>
        {props.description && (
          <p className="mt-1 text-xs text-foreground/70 line-clamp-2">
            {props.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <a
          href={props.downloadUrl}
          target="_blank"
          rel="noopener"
          className={`${ROW_ACTION} text-foreground/80 hover:bg-muted hover:text-foreground`}
        >
          <Download aria-hidden className="size-3.5" />
          Download
        </a>
        <EditDocumentDialog {...props} />
        <ConfirmDialog
          trigger={
            <button
              type="button"
              className={`${ROW_ACTION} border border-destructive/40 text-destructive hover:bg-destructive/10`}
            >
              <Trash2 aria-hidden className="size-3.5" />
              Delete
            </button>
          }
          title={`Delete “${props.title}” for everyone?`}
          description="It disappears from the resources page and from this list straight away. The file stays in storage for now."
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          onConfirm={async () => {
            const fd = new FormData();
            fd.set("id", props.id);
            try {
              await deleteDocumentAction(fd);
              toast.success(`Deleted “${props.title}”.`);
            } catch {
              toast.error("Couldn't delete that document. Try again.");
            }
          }}
        />
      </div>
    </div>
  );
}

function EditDocumentDialog(props: DocumentRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={`${ROW_ACTION} text-foreground/80 hover:bg-muted hover:text-foreground`}
          />
        }
      >
        <Pencil aria-hidden className="size-3.5" />
        Edit
        <span className="sr-only"> “{props.title}”</span>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Changes show on the resources page as soon as you save.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each edit starts from a clean slate. */}
        <EditDocumentForm {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditDocumentForm({
  onSaved,
  ...props
}: DocumentRowProps & { onSaved: () => void }) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: EditDocumentState, fd: FormData) => {
      const result = await updateDocumentAction(prev, fd);
      if (result.ok) {
        toast.success(`Saved “${String(fd.get("title") ?? props.title)}”.`);
        onSaved();
      }
      return result;
    },
    {},
  );
  const error = fileError ?? (!state.ok ? state.error : null) ?? null;
  const id = (name: string) => `doc-${props.id}-${name}`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={props.id} />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={id("title")}>Title</Label>
        <Input
          id={id("title")}
          name="title"
          required
          maxLength={160}
          defaultValue={props.title}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("category")}>Category</Label>
        <Select
          name="category"
          defaultValue={props.category}
          disabled={pending}
          items={CATEGORY_LABELS}
        >
          <SelectTrigger id={id("category")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("visibility")}>Who can see it?</Label>
        <Select
          name="visibility"
          defaultValue={props.visibility}
          disabled={pending}
          items={VISIBILITY_LABELS}
        >
          <SelectTrigger id={id("visibility")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_ORDER.map((v) => (
              <SelectItem key={v} value={v}>
                {VISIBILITY_LABELS[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("description")}>
          Description
          <span className="font-normal text-foreground/70">(optional)</span>
        </Label>
        <Textarea
          id={id("description")}
          name="description"
          rows={2}
          maxLength={600}
          defaultValue={props.description ?? ""}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("file")}>
          Replace the file
          <span className="font-normal text-foreground/70">(optional)</span>
        </Label>
        <input
          id={id("file")}
          type="file"
          name="file"
          disabled={pending}
          accept={Array.from(ALLOWED_MIME_TYPES).join(",")}
          aria-describedby={id("file-help")}
          onChange={(e) => {
            const next = e.target.files?.[0];
            setFileError(null);
            if (!next) return;
            if (!ALLOWED_MIME_TYPES.has(next.type)) {
              setFileError(
                "We can only take PDFs, Word docs, and images right now.",
              );
              e.target.value = "";
            } else if (next.size > MAX_UPLOAD_BYTES) {
              setFileError(
                "That file is bigger than 25 MB — please compress it or split it up.",
              );
              e.target.value = "";
            }
          }}
          className="block w-full text-sm text-foreground/80 file:mr-3 file:h-9 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:text-xs file:font-semibold file:text-foreground"
        />
        <p id={id("file-help")} className="text-xs text-foreground/70">
          Overwrites the current {shortType(props.mimeType)} — the same link
          keeps working. Leave empty to keep it.
        </p>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden className="motion-safe:animate-spin" />
          ) : null}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function shortType(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return mime.slice(6).toUpperCase();
  if (mime.includes("wordprocessingml")) return "DOCX";
  if (mime === "application/msword") return "DOC";
  if (mime.includes("spreadsheetml")) return "XLSX";
  if (mime === "application/vnd.ms-excel") return "XLS";
  if (mime === "text/plain") return "TXT";
  return mime;
}
