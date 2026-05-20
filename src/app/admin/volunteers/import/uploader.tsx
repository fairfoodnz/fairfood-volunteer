"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  CircleSlash,
  RotateCw,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fullName } from "@/lib/users";
import { parseFileAction, confirmImportAction, type ParseResult } from "./actions";
import type { ImportPreviewRow, ImportStatus } from "@/lib/volunteers-import";

/**
 * Client-side wrapper for the upload + preview + confirm flow.
 *
 * State machine:
 *
 *   IDLE  ── pick file / drop ──▶  PARSING
 *   PARSING ── ok ──▶  PREVIEW   (rows in memory, no DB writes)
 *   PARSING ── err ─▶  IDLE      (toast)
 *   PREVIEW ── confirm ──▶  IMPORTING
 *   IMPORTING ── ok ─▶  DONE     (banner + reset link)
 *
 * The original File object is held in `fileRef` so we can re-submit it on
 * confirm — the server re-parses the bytes rather than trusting any JSON the
 * client carried across the round trip.
 */

type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

type Filter = "all" | "new" | "existing" | "skip" | "error";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All rows" },
  { key: "new", label: "New" },
  { key: "existing", label: "Already on file" },
  { key: "skip", label: "Duplicates" },
  { key: "error", label: "Errors" },
];

const STATUS_LABEL: Record<ImportStatus, string> = {
  new: "New",
  existing: "Exists",
  skip: "Duplicate",
  error: "Error",
};

export function ImportUploader() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sendInvites, setSendInvites] = React.useState(true);
  const [dragOver, setDragOver] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState<{
    created: number;
    skipped: number;
    errors: number;
    invitesSent: boolean;
  } | null>(null);

  const fileRef = React.useRef<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = React.useCallback(async (file: File) => {
    fileRef.current = file;
    setPhase("parsing");
    setParseResult(null);
    setImportSummary(null);
    setFilter("all");

    const formData = new FormData();
    formData.append("file", file);
    const result = await parseFileAction(null, formData);
    if (!result.ok) {
      toast.error(result.error);
      setPhase("idle");
      fileRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setParseResult(result);
    setPhase("preview");
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const reset = () => {
    fileRef.current = null;
    setParseResult(null);
    setImportSummary(null);
    setPhase("idle");
    setFilter("all");
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirm = async () => {
    const file = fileRef.current;
    if (!file) return;
    setPhase("importing");
    const formData = new FormData();
    formData.append("file", file);
    if (sendInvites) formData.append("sendInvites", "on");
    const result = await confirmImportAction(formData);
    if (!result.ok) {
      toast.error(result.error);
      setPhase("preview");
      return;
    }
    setImportSummary({
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
      invitesSent: sendInvites && result.created > 0,
    });
    setPhase("done");
    toast.success(
      result.created > 0
        ? `Created ${result.created} account${result.created === 1 ? "" : "s"}${
            sendInvites && result.created > 0 ? " and sent invites" : ""
          }.`
        : "No new accounts to create.",
    );
    router.refresh();
  };

  return (
    <section className="mt-10">
      {phase === "idle" || phase === "parsing" ? (
        <Dropzone
          dragOver={dragOver}
          parsing={phase === "parsing"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onPick={() => inputRef.current?.click()}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={onInputChange}
      />

      {phase === "preview" && parseResult?.ok ? (
        <Preview
          result={parseResult}
          filter={filter}
          setFilter={setFilter}
          sendInvites={sendInvites}
          setSendInvites={setSendInvites}
          onConfirm={confirm}
          onCancel={reset}
        />
      ) : null}

      {phase === "importing" ? (
        <div className="mt-6 rounded-md border border-border bg-card p-8 text-center">
          <CircleDashed className="mx-auto size-6 animate-spin text-leaf-deep" />
          <p className="mt-3 text-sm font-medium">Creating accounts…</p>
          <p className="mt-1 text-xs text-foreground/55">
            This usually takes a couple of seconds. Hold on.
          </p>
        </div>
      ) : null}

      {phase === "done" && importSummary ? (
        <DoneBanner summary={importSummary} onReset={reset} />
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dropzone
// ---------------------------------------------------------------------------

function Dropzone(props: {
  dragOver: boolean;
  parsing: boolean;
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  onPick: () => void;
}) {
  return (
    <div>
      <label
        htmlFor="" // empty — pick handled via onClick, not native label/input
        onClick={(e) => {
          e.preventDefault();
          if (!props.parsing) props.onPick();
        }}
        onDragOver={props.onDragOver}
        onDragLeave={props.onDragLeave}
        onDrop={props.onDrop}
        className={cn(
          "relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed bg-card px-6 py-12 text-center transition-colors",
          "focus-within:border-leaf-deep focus-within:ring-3 focus-within:ring-leaf-deep/20",
          props.dragOver
            ? "border-leaf-deep bg-leaf-deep/5"
            : "border-border hover:border-leaf-deep/50",
          props.parsing && "pointer-events-none opacity-70",
        )}
        aria-busy={props.parsing}
      >
        <div className="grid size-14 place-items-center rounded-full bg-leaf-deep/10">
          {props.parsing ? (
            <CircleDashed className="size-6 animate-spin text-leaf-deep" />
          ) : (
            <UploadCloud className="size-6 text-leaf-deep" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            {props.parsing ? "Reading the file…" : "Drop your roster here"}
          </p>
          <p className="text-sm text-foreground/65">
            Or{" "}
            <span className="font-semibold text-leaf-deep underline underline-offset-2">
              click to browse
            </span>
            {" — "}
            CSV or .xlsx up to 5 MB
          </p>
        </div>
      </label>

      <details className="mt-4 rounded-md border border-border bg-cream-deep/40 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground/85">
          What columns do I need?
        </summary>
        <div className="mt-3 space-y-2 text-foreground/75">
          <p>
            We&rsquo;ll auto-match by header name (case-insensitive). At a
            minimum, your file needs a <strong>First</strong> and an{" "}
            <strong>Email</strong> column. Anything else we recognise gets used:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                First, Last
              </code>{" "}
              — split-name fields
            </li>
            <li>
              <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                Email(s)
              </code>{" "}
              — we take the first valid one; the rest get noted on the profile
            </li>
            <li>
              <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                Phone, Phone Type
              </code>
            </li>
            <li>
              <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                Address1, Address2, City, State, Postal Code, Country
              </code>{" "}
              — collapsed into the profile&rsquo;s notes
            </li>
            <li>
              <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                Hours
              </code>{" "}
              — recorded as &ldquo;previously logged&rdquo;
            </li>
          </ul>
          <p className="pt-1 text-xs text-foreground/55">
            Extra columns are ignored — you can drop in your file unchanged.
          </p>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function Preview(props: {
  result: Extract<ParseResult, { ok: true }>;
  filter: Filter;
  setFilter: (f: Filter) => void;
  sendInvites: boolean;
  setSendInvites: (b: boolean) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { result, filter, sendInvites } = props;
  const { roster, counts, filename } = result;
  const totalRows = roster.rows.length;
  const willCreate = counts.new;

  const visibleRows = roster.rows.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  return (
    <div className="mt-6 space-y-6">
      {/* File summary bar */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="size-5 text-leaf-deep" />
          <div>
            <p className="text-sm font-semibold">{filename}</p>
            <p className="text-xs text-foreground/55">
              {totalRows.toLocaleString()} row{totalRows === 1 ? "" : "s"} ·{" "}
              {roster.matched.length} field
              {roster.matched.length === 1 ? "" : "s"} matched
              {roster.unrecognised.length > 0 ? (
                <>
                  {" · "}
                  <span title={roster.unrecognised.join(", ")}>
                    {roster.unrecognised.length} ignored
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onCancel}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground/65 hover:text-foreground"
        >
          <X className="size-3.5" />
          Choose a different file
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <CountTile
          tone="leaf"
          label="To create"
          value={counts.new}
          hint={counts.new === 0 ? "Nothing new in this file" : "Will get an account"}
        />
        <CountTile
          tone="muted"
          label="Already on file"
          value={counts.existing}
          hint={counts.existing > 0 ? "Will be skipped" : "—"}
        />
        <CountTile
          tone="muted"
          label="Duplicates in file"
          value={counts.skip}
          hint={counts.skip > 0 ? "Same email twice — kept the first" : "—"}
        />
        <CountTile
          tone={counts.error > 0 ? "tomato" : "muted"}
          label="Errors"
          value={counts.error}
          hint={counts.error > 0 ? "Fix the file and re-upload" : "Clean"}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter rows" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const c = f.key === "all" ? totalRows : counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => props.setFilter(f.key)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-leaf bg-leaf text-cream"
                    : "border-border bg-card text-foreground/75 hover:border-leaf/40 hover:text-leaf-deep",
                )}
                aria-pressed={active}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums",
                    active ? "bg-cream/25 text-cream" : "bg-foreground/10 text-foreground/65",
                  )}
                >
                  {c}
                </span>
              </button>
            );
          })}
        </nav>
        <p className="text-xs text-foreground/55">
          Showing {visibleRows.length.toLocaleString()} of{" "}
          {totalRows.toLocaleString()}
        </p>
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {visibleRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground/65">
            No rows match this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep text-left text-foreground/65">
                <tr>
                  <th className="w-12 px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Row
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Name
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Email
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest md:table-cell">
                    Phone
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest lg:table-cell">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, 200).map((r) => (
                  <PreviewRow key={r.rowNumber} row={r} />
                ))}
              </tbody>
            </table>
            {visibleRows.length > 200 ? (
              <div className="border-t border-border bg-cream-deep/40 px-4 py-2 text-center text-xs text-foreground/55">
                Showing the first 200 rows in this filter. All{" "}
                {visibleRows.length.toLocaleString()} will be processed on
                import.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Confirm bar */}
      <div className="sticky bottom-0 z-20 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => props.setSendInvites(e.target.checked)}
              className="size-4 rounded border-border accent-leaf-deep"
              aria-describedby="send-invites-hint"
            />
            <span>
              <span className="font-semibold">Send claim invites now</span>
              <span id="send-invites-hint" className="ml-2 text-foreground/55">
                One-time link, expires in 7 days
              </span>
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" onClick={props.onCancel}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={() => void props.onConfirm()}
              disabled={willCreate === 0}
              className="bg-leaf-deep text-cream hover:bg-leaf-deep/90 disabled:cursor-not-allowed"
            >
              {willCreate === 0
                ? "Nothing to create"
                : `Create ${willCreate.toLocaleString()} account${willCreate === 1 ? "" : "s"}`}
              {willCreate > 0 && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ row }: { row: ImportPreviewRow }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3 font-mono text-xs text-foreground/55 tabular-nums">
        {row.rowNumber}
      </td>
      <td className="px-4 py-3">
        <StatusPill status={row.status} reason={row.reason} />
      </td>
      <td className="px-4 py-3">
        <span className="font-medium">
          {fullName({ firstName: row.firstName || "—", lastName: row.lastName })}
        </span>
      </td>
      <td className="px-4 py-3 text-foreground/75">
        <span className="break-all">{row.email || "—"}</span>
      </td>
      <td className="hidden px-4 py-3 text-foreground/75 md:table-cell">
        {row.phone ?? "—"}
      </td>
      <td className="hidden max-w-[24rem] px-4 py-3 text-xs text-foreground/65 lg:table-cell">
        {row.notes ? (
          <span className="line-clamp-2 whitespace-pre-line">{row.notes}</span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function StatusPill({ status, reason }: { status: ImportStatus; reason?: string }) {
  const palette: Record<
    ImportStatus,
    { className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    new: { className: "bg-leaf/15 text-leaf-deep", icon: CheckCircle2 },
    existing: { className: "bg-foreground/10 text-foreground/65", icon: CircleSlash },
    skip: { className: "bg-foreground/10 text-foreground/65", icon: CircleSlash },
    error: { className: "bg-tomato/15 text-tomato", icon: AlertTriangle },
  };
  const { className, icon: Icon } = palette[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        className,
      )}
      title={reason}
    >
      <Icon className="size-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function CountTile({
  tone,
  label,
  value,
  hint,
}: {
  tone: "leaf" | "tomato" | "muted";
  label: string;
  value: number;
  hint: string;
}) {
  const accent =
    tone === "leaf"
      ? "border-leaf/40 bg-leaf/[0.06]"
      : tone === "tomato"
        ? "border-tomato/40 bg-tomato/[0.06]"
        : "border-border bg-card";
  const valueTone =
    tone === "tomato" && value > 0 ? "text-tomato" : "text-foreground";
  return (
    <div className={cn("rounded-md border p-4", accent)}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </p>
      <p
        className={cn("display mt-1.5 text-2xl font-bold tabular-nums", valueTone)}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-foreground/55">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Done banner
// ---------------------------------------------------------------------------

function DoneBanner({
  summary,
  onReset,
}: {
  summary: { created: number; skipped: number; errors: number; invitesSent: boolean };
  onReset: () => void;
}) {
  return (
    <div className="mt-6 rounded-md border border-leaf/40 bg-leaf/[0.06] p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-leaf-deep">
          <CheckCircle2 className="size-5 text-cream" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold">Import complete</p>
          <p className="mt-1 text-sm text-foreground/75">
            Created <strong>{summary.created}</strong> account
            {summary.created === 1 ? "" : "s"}
            {summary.invitesSent ? (
              <> and emailed claim invites.</>
            ) : (
              <>. You can send invites from the list below.</>
            )}
            {summary.skipped > 0 ? (
              <>
                {" "}
                Skipped <strong>{summary.skipped}</strong> already-on-file or
                duplicate row{summary.skipped === 1 ? "" : "s"}.
              </>
            ) : null}
            {summary.errors > 0 ? (
              <>
                {" "}
                Left <strong>{summary.errors}</strong> error row
                {summary.errors === 1 ? "" : "s"} untouched.
              </>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={onReset}>
              <RotateCw className="size-4" />
              Import another file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
