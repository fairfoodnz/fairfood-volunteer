"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  uploadDocumentAction,
  type UploadState,
} from "@/app/admin/documents/actions";
import { DocumentCategory, DocumentVisibility } from "@/generated/prisma";

const INITIAL_STATE: UploadState = {};

export function DocumentUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: UploadState, fd: FormData) => {
      const result = await uploadDocumentAction(prev, fd);
      if (result.ok) {
        toast.success("Document uploaded.");
        setFile(null);
        setLocalError(null);
        formRef.current?.reset();
      }
      return result;
    },
    INITIAL_STATE,
  );

  function pickFile(next: File | null) {
    setLocalError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(next.type)) {
      setLocalError("We can only take PDFs, Word docs, and images right now.");
      return;
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setLocalError(
        "That file is bigger than 25 MB — please compress it or split it up.",
      );
      return;
    }
    setFile(next);
  }

  const serverError = !state.ok && state.error ? state.error : null;
  const error = localError ?? serverError;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) {
          pickFile(dropped);
          // Mirror the drop into the hidden input so the server action sees it.
          if (inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(dropped);
            inputRef.current.files = dt.files;
          }
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        name="file"
        className="sr-only"
        accept={Array.from(ALLOWED_MIME_TYPES).join(",")}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-tomato/40 bg-tomato/10 px-4 py-3 text-sm text-tomato"
        >
          {error}
        </div>
      )}

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed bg-cream-deep p-8 text-center transition-colors",
            dragOver
              ? "border-leaf bg-leaf/5"
              : "border-border hover:border-leaf/70",
          )}
        >
          <Upload className="size-8 text-leaf-deep" />
          <span className="text-sm font-medium text-foreground">
            Drop a file here or click to choose
          </span>
          <span className="font-mono text-xs text-foreground/55">
            PDF · DOCX · JPG · PNG up to 25 MB
          </span>
        </button>
      ) : (
        <div className="space-y-4 rounded-md border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {file.name}
              </p>
              <p className="mt-0.5 font-mono text-xs text-foreground/55">
                {formatBytes(file.size)} · {file.type || "unknown type"}
              </p>
            </div>
            {!pending && (
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-md p-1 text-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Field label="Title" htmlFor="doc-title">
              <input
                id="doc-title"
                name="title"
                required
                maxLength={160}
                defaultValue={titleFromFilename(file.name)}
                disabled={pending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
              />
            </Field>
            <Field label="Category" htmlFor="doc-category">
              <select
                id="doc-category"
                name="category"
                defaultValue={DocumentCategory.OTHER}
                disabled={pending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Who can see it?" htmlFor="doc-visibility">
              <select
                id="doc-visibility"
                name="visibility"
                defaultValue={DocumentVisibility.VOLUNTEER}
                disabled={pending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
              >
                {VISIBILITY_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABELS[v]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description (optional)" htmlFor="doc-description">
              <textarea
                id="doc-description"
                name="description"
                maxLength={600}
                rows={2}
                disabled={pending}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
              />
            </Field>
          </div>

          {pending && (
            <div
              role="status"
              aria-live="polite"
              className="space-y-2"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-leaf" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-foreground/55">
                Uploading…
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFile(null);
                setLocalError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center rounded-md bg-leaf px-5 text-sm font-semibold text-cream hover:bg-leaf-deep disabled:opacity-60"
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </span>
      {children}
    </label>
  );
}

function titleFromFilename(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}
