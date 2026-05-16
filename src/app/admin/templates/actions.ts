"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  enumerateDates,
  isHHMM,
  minutesOf,
  nzWallTimeToUtc,
} from "@/lib/schedule";

export type TemplateFormState = { ok?: boolean; error?: string };

// A bulk run is capped so a fat-fingered date range can't spawn thousands of
// rows in one transaction. dates × templates must stay under this.
const MAX_BULK_SHIFTS = 750;

const TimeRange = z
  .object({
    startTime: z.string().refine(isHHMM, "Use a valid start time."),
    endTime: z.string().refine(isHHMM, "Use a valid end time."),
  })
  .refine((v) => minutesOf(v.endTime) > minutesOf(v.startTime), {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

const TemplateFields = z.object({
  programId: z.string().min(1),
  label: z.string().trim().min(1, "Give the template a name.").max(80),
  capacity: z.coerce.number().int().min(1).max(200),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  active: z.coerce.boolean(),
  order: z.coerce.number().int().min(0).max(9999),
});

function parseTemplate(formData: FormData) {
  const base = TemplateFields.safeParse({
    programId: formData.get("programId"),
    label: formData.get("label"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") ?? "",
    active: formData.get("active") != null,
    order: formData.get("order") || 0,
  });
  const time = TimeRange.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!base.success) {
    return { error: base.error.issues[0]?.message ?? "Check the form." };
  }
  if (!time.success) {
    return { error: time.error.issues[0]?.message ?? "Check the times." };
  }
  return { data: { ...base.data, ...time.data } };
}

export async function createTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await requireAdmin();
  const parsed = parseTemplate(formData);
  if ("error" in parsed) return { error: parsed.error };
  const f = parsed.data;

  const program = await db.program.findUnique({
    where: { id: f.programId },
    select: { id: true },
  });
  if (!program) return { error: "That programme no longer exists." };

  await db.shiftTemplate.create({
    data: {
      programId: f.programId,
      label: f.label,
      startTime: f.startTime,
      endTime: f.endTime,
      capacity: f.capacity,
      notes: f.notes ? f.notes : null,
      active: f.active,
      order: f.order,
    },
  });

  revalidatePath(`/admin/programmes/${f.programId}`);
  revalidatePath("/admin/shifts/bulk");
  return { ok: true };
}

export async function updateTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing template id." };

  const parsed = parseTemplate(formData);
  if ("error" in parsed) return { error: parsed.error };
  const f = parsed.data;

  const existing = await db.shiftTemplate.findUnique({
    where: { id },
    select: { id: true, programId: true },
  });
  if (!existing) return { error: "That template no longer exists." };

  await db.shiftTemplate.update({
    where: { id },
    data: {
      label: f.label,
      startTime: f.startTime,
      endTime: f.endTime,
      capacity: f.capacity,
      notes: f.notes ? f.notes : null,
      active: f.active,
      order: f.order,
    },
  });

  revalidatePath(`/admin/programmes/${existing.programId}`);
  revalidatePath("/admin/shifts/bulk");
  return { ok: true };
}

export async function deleteTemplate(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  // Deleting a template leaves already-generated shifts untouched (no FK) —
  // it just stops future bulk runs from using it.
  const t = await db.shiftTemplate.findUnique({
    where: { id },
    select: { programId: true },
  });
  if (!t) return;

  await db.shiftTemplate.delete({ where: { id } });
  revalidatePath(`/admin/programmes/${t.programId}`);
  revalidatePath("/admin/shifts/bulk");
}

const BulkInput = z.object({
  programId: z.string().min(1),
  templateIds: z.array(z.string().min(1)).min(1, "Pick at least one template."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date."),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one weekday."),
  dryRun: z.boolean(),
});

export type BulkScheduleInput = z.infer<typeof BulkInput>;

export type BulkScheduleResult =
  | { ok: false; error: string }
  | {
      ok: true;
      committed: boolean;
      created: number;
      skipped: number;
      total: number;
      perTemplate: {
        templateId: string;
        label: string;
        created: number;
        skipped: number;
      }[];
      // First handful of resulting shifts (epoch ms), oldest first, for preview.
      sample: { startsAt: number; endsAt: number; label: string; duplicate: boolean }[];
    };

export async function bulkSchedule(
  input: BulkScheduleInput,
): Promise<BulkScheduleResult> {
  await requireAdmin();

  const parsed = BulkInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { programId, templateIds, startDate, endDate, weekdays, dryRun } =
    parsed.data;

  if (endDate < startDate) {
    return { ok: false, error: "The end date is before the start date." };
  }

  const templates = await db.shiftTemplate.findMany({
    where: { id: { in: templateIds }, programId, active: true },
    orderBy: { order: "asc" },
  });
  if (templates.length === 0) {
    return { ok: false, error: "None of the selected templates are available." };
  }

  const dates = enumerateDates(startDate, endDate, weekdays, MAX_BULK_SHIFTS);
  if (dates.length === 0) {
    return {
      ok: false,
      error: "No dates in that range fall on the selected weekdays.",
    };
  }
  if (dates.length * templates.length > MAX_BULK_SHIFTS) {
    return {
      ok: false,
      error: `That would create over ${MAX_BULK_SHIFTS} shifts — narrow the date range or pick fewer templates.`,
    };
  }

  // Build every candidate, then mark duplicates: a shift already exists for
  // this programme at the exact same start instant (any state — we don't want
  // to silently resurrect a cancelled slot), or two templates collide on the
  // same instant within this run.
  type Candidate = {
    templateId: string;
    label: string;
    startsAt: Date;
    endsAt: Date;
  };
  const candidates: Candidate[] = [];
  for (const t of templates) {
    for (const d of dates) {
      candidates.push({
        templateId: t.id,
        label: t.label,
        startsAt: nzWallTimeToUtc(d, t.startTime),
        endsAt: nzWallTimeToUtc(d, t.endTime),
      });
    }
  }

  const existing = await db.shift.findMany({
    where: {
      programId,
      startsAt: { in: candidates.map((c) => c.startsAt) },
    },
    select: { startsAt: true },
  });
  const taken = new Set(existing.map((e) => e.startsAt.getTime()));

  const perTemplate = new Map<
    string,
    { templateId: string; label: string; created: number; skipped: number }
  >();
  for (const t of templates) {
    perTemplate.set(t.id, {
      templateId: t.id,
      label: t.label,
      created: 0,
      skipped: 0,
    });
  }

  const toCreate: Candidate[] = [];
  const seenInRun = new Set<number>();
  let created = 0;
  let skipped = 0;
  for (const c of candidates) {
    const ms = c.startsAt.getTime();
    const dup = taken.has(ms) || seenInRun.has(ms);
    const row = perTemplate.get(c.templateId)!;
    if (dup) {
      skipped += 1;
      row.skipped += 1;
    } else {
      created += 1;
      row.created += 1;
      seenInRun.add(ms);
      toCreate.push(c);
    }
  }

  const sample = candidates
    .slice()
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 12)
    .map((c) => ({
      startsAt: c.startsAt.getTime(),
      endsAt: c.endsAt.getTime(),
      label: c.label,
      duplicate: taken.has(c.startsAt.getTime()),
    }));

  if (!dryRun && toCreate.length > 0) {
    await db.shift.createMany({
      data: toCreate.map((c) => {
        const t = templates.find((x) => x.id === c.templateId)!;
        return {
          programId,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          capacity: t.capacity,
          notes: t.notes,
        };
      }),
    });
    revalidatePath("/admin");
    revalidatePath("/shifts");
  }

  return {
    ok: true,
    committed: !dryRun,
    created,
    skipped,
    total: candidates.length,
    perTemplate: [...perTemplate.values()],
    sample,
  };
}
