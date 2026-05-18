"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarRange, Check, Pencil } from "lucide-react";
import {
  bulkSchedule,
  type BulkScheduleResult,
} from "@/app/admin/templates/actions";
import { WEEKDAYS } from "@/lib/schedule";
import { formatShiftRange } from "@/lib/programs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

type TemplateLite = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
};
type ProgrammeLite = {
  id: string;
  title: string;
  templates: TemplateLite[];
};

/** Today's date in NZ as YYYY-MM-DD (en-CA renders ISO order). */
function nzToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function BulkScheduler({
  programmes,
}: {
  programmes: ProgrammeLite[];
}) {
  const router = useRouter();
  const today = useMemo(() => nzToday(), []);

  const [programId, setProgramId] = useState(programmes[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDaysISO(today, 42));
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<
    Extract<BulkScheduleResult, { ok: true }> | null
  >(null);
  const [pending, startTransition] = useTransition();

  const programme = programmes.find((p) => p.id === programId);
  const templates = programme?.templates ?? [];

  // Any change to the plan invalidates a previously computed preview so a
  // stale plan can't be committed.
  function invalidate() {
    setPreview(null);
  }

  function toggleTemplate(id: string) {
    invalidate();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleWeekday(value: number) {
    invalidate();
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function changeProgramme(id: string) {
    setProgramId(id);
    setSelected(new Set());
    invalidate();
  }

  const canRun =
    programId !== "" &&
    selected.size > 0 &&
    weekdays.size > 0 &&
    startDate !== "" &&
    endDate !== "" &&
    endDate >= startDate;

  function run(dryRun: boolean) {
    if (!canRun) return;
    startTransition(async () => {
      const result = await bulkSchedule({
        programId,
        templateIds: [...selected],
        startDate,
        endDate,
        weekdays: [...weekdays],
        dryRun,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.committed) {
        toast.success(
          `Created ${result.created} ${result.created === 1 ? "shift" : "shifts"}.`,
        );
        router.push("/admin");
        router.refresh();
        return;
      }
      setPreview(result);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* ---- Plan ---- */}
      <div className="space-y-6 rounded-md border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="programme">Programme</Label>
          <select
            id="programme"
            value={programId}
            onChange={(e) => changeProgramme(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Templates</Label>
            {programId && (
              <Link
                href={`/admin/programmes/${programId}#shift-templates`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-leaf-deep hover:underline"
              >
                <Pencil className="size-3" />
                Manage templates
              </Link>
            )}
          </div>
          {templates.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-foreground/65">
              This programme has no active templates.{" "}
              <Link
                href={`/admin/programmes/${programId}#shift-templates`}
                className="font-semibold text-leaf-deep hover:underline"
              >
                Add one on its page
              </Link>{" "}
              first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => {
                const on = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTemplate(t.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors",
                      on
                        ? "border-leaf bg-leaf/5 ring-2 ring-leaf/30"
                        : "border-border hover:border-foreground/35",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                        on
                          ? "border-leaf bg-leaf text-cream"
                          : "border-foreground/30",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {t.label}
                      </span>
                      <span className="block text-xs text-foreground/65">
                        {formatTime12(t.startTime)} – {formatTime12(t.endTime)}{" "}
                        · {t.capacity} spots
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">From</Label>
            <DatePicker
              id="startDate"
              value={startDate}
              min={today}
              onValueChange={(v) => {
                invalidate();
                setStartDate(v);
              }}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Until</Label>
            <DatePicker
              id="endDate"
              value={endDate}
              min={startDate || today}
              onValueChange={(v) => {
                invalidate();
                setEndDate(v);
              }}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = weekdays.has(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleWeekday(d.value)}
                  aria-pressed={on}
                  className={cn(
                    "h-10 min-w-[3.25rem] rounded-md border px-3 text-sm font-medium transition-colors",
                    on
                      ? "border-leaf bg-leaf text-cream"
                      : "border-border hover:border-foreground/35",
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={!canRun || pending}
            onClick={() => run(true)}
            className="gap-1.5 bg-leaf hover:bg-leaf-deep"
          >
            <CalendarRange className="size-4" />
            {pending && !preview ? "Checking…" : "Preview schedule"}
          </Button>
        </div>
      </div>

      {/* ---- Preview ---- */}
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="display text-lg font-semibold">Preview</h2>
        {!preview ? (
          <p className="mt-2 text-sm text-foreground/65">
            Choose templates, a date range and weekdays, then preview to see
            exactly which shifts will be created before anything is saved.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="New" value={preview.created} accent />
              <Metric label="Skipped" value={preview.skipped} />
              <Metric label="Total" value={preview.total} />
            </div>

            {preview.skipped > 0 && (
              <p className="rounded-md border border-border bg-cream-deep px-3 py-2 text-xs text-foreground/70">
                {preview.skipped} already exist at that exact time and will be
                left alone.
              </p>
            )}

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                Per template
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {preview.perTemplate.map((pt) => (
                  <li
                    key={pt.templateId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{pt.label}</span>
                    <span className="shrink-0 tabular-nums text-foreground/70">
                      +{pt.created}
                      {pt.skipped > 0 && (
                        <span className="text-foreground/45">
                          {" "}
                          / {pt.skipped} skipped
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                First shifts
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {preview.sample.map((s, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-2",
                      s.duplicate && "text-foreground/45 line-through",
                    )}
                  >
                    <span>
                      {formatShiftRange(
                        new Date(s.startsAt),
                        new Date(s.endsAt),
                      )}
                    </span>
                  </li>
                ))}
                {preview.total > preview.sample.length && (
                  <li className="text-xs text-foreground/55">
                    …and {preview.total - preview.sample.length} more
                  </li>
                )}
              </ul>
            </div>

            <Button
              type="button"
              disabled={pending || preview.created === 0}
              onClick={() => run(false)}
              className="w-full gap-1.5 bg-leaf hover:bg-leaf-deep"
            >
              <Check className="size-4" />
              {pending
                ? "Creating…"
                : preview.created === 0
                  ? "Nothing new to create"
                  : `Create ${preview.created} ${preview.created === 1 ? "shift" : "shifts"}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p
        className={cn(
          "display text-2xl font-bold tabular-nums",
          accent && "text-leaf-deep",
        )}
      >
        {value}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </p>
    </div>
  );
}
