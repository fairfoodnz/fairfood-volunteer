"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { formatBytes } from "@/lib/documents";
import { deleteDocumentAction } from "@/app/admin/documents/actions";

export type DocumentRowProps = {
  id: string;
  title: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
};

export function DocumentRow(props: DocumentRowProps) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", props.id);
      await deleteDocumentAction(fd);
      toast.success(`Deleted “${props.title}”.`);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {props.title}
        </p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-foreground/55">
          {shortType(props.mimeType)} · {formatBytes(props.sizeBytes)} ·{" "}
          {props.createdAt}
        </p>
        {props.description && (
          <p className="mt-1 text-xs text-foreground/65 line-clamp-2">
            {props.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={props.downloadUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground/75 hover:bg-muted hover:text-foreground"
        >
          <Download className="size-3.5" />
          Download
        </a>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={(props) => (
              <button
                {...props}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tomato/40 px-2.5 text-xs font-medium text-tomato hover:bg-tomato/10"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            )}
          />
          <DialogContent role="alertdialog" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete “{props.title}” for everyone?</DialogTitle>
              <DialogDescription>
                Volunteers will no longer see this document on the resources
                page. The file stays in storage for now.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={(props) => (
                  <button
                    {...props}
                    autoFocus
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                )}
              />
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato/90 disabled:opacity-70"
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
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
