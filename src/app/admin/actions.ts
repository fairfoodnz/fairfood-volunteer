"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nzWallTimeToUtc } from "@/lib/schedule";
import { BookingStatus } from "@/generated/prisma";

const ShiftFieldsSchema = z.object({
  programSlug: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
});

// Statuses that hold a real spot on the roster. Used to stop capacity being
// edited below the number of volunteers already counting on the shift.
const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.ATTENDED,
] as const;

/**
 * A `datetime-local` input has no timezone — the coordinator typed an NZ
 * wall-clock time. Interpret it as Pacific/Auckland (DST-aware) so it lines up
 * with how shifts are displayed everywhere else, rather than the server's TZ.
 */
function dateTimeLocalToUtc(value: string): Date {
  const [date, time = "00:00"] = value.split("T");
  return nzWallTimeToUtc(date, time);
}

export async function createShift(formData: FormData) {
  await requireAdmin();
  const parsed = ShiftFieldsSchema.parse({
    programSlug: formData.get("programSlug"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") || undefined,
  });
  const program = await db.program.findUnique({
    where: { slug: parsed.programSlug },
  });
  if (!program) throw new Error("Program not found");

  const startsAt = dateTimeLocalToUtc(parsed.startsAt);
  const endsAt = dateTimeLocalToUtc(parsed.endsAt);
  if (endsAt <= startsAt) {
    throw new Error("Shift end time must be after the start time.");
  }

  const shift = await db.shift.create({
    data: {
      programId: program.id,
      startsAt,
      endsAt,
      capacity: parsed.capacity,
      notes: parsed.notes,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/shifts");
  redirect(`/admin/shifts/${shift.id}`);
}

const UpdateShiftSchema = ShiftFieldsSchema.extend({
  shiftId: z.string().min(1),
});

export async function updateShift(formData: FormData) {
  await requireAdmin();
  const parsed = UpdateShiftSchema.parse({
    shiftId: formData.get("shiftId"),
    programSlug: formData.get("programSlug"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") || undefined,
  });

  const existing = await db.shift.findUnique({
    where: { id: parsed.shiftId },
    include: { program: true },
  });
  if (!existing) throw new Error("Shift not found");

  const program = await db.program.findUnique({
    where: { slug: parsed.programSlug },
  });
  if (!program) throw new Error("Program not found");

  const startsAt = dateTimeLocalToUtc(parsed.startsAt);
  const endsAt = dateTimeLocalToUtc(parsed.endsAt);
  if (endsAt <= startsAt) {
    throw new Error("Shift end time must be after the start time.");
  }

  // Don't let capacity drop below volunteers already holding a spot — that
  // would silently over-book the roster.
  const taken = await db.booking.count({
    where: {
      shiftId: parsed.shiftId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
  });
  if (parsed.capacity < taken) {
    throw new Error(
      `Capacity can't be lower than the ${taken} volunteer${taken === 1 ? "" : "s"} already booked. Cancel a booking first or pick a higher number.`,
    );
  }

  await db.shift.update({
    where: { id: parsed.shiftId },
    data: {
      programId: program.id,
      startsAt,
      endsAt,
      capacity: parsed.capacity,
      notes: parsed.notes ?? null,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/shifts/${parsed.shiftId}`);
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${parsed.shiftId}`);
  revalidatePath(`/programs/${program.slug}`);
  if (program.slug !== existing.program.slug) {
    revalidatePath(`/programs/${existing.program.slug}`);
  }
  redirect(`/admin/shifts/${parsed.shiftId}`);
}

const StatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.nativeEnum(BookingStatus),
});

export async function setBookingStatus(formData: FormData) {
  await requireAdmin();
  const parsed = StatusSchema.parse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
  });
  const booking = await db.booking.update({
    where: { id: parsed.bookingId },
    data: { status: parsed.status },
  });
  revalidatePath(`/admin/shifts/${booking.shiftId}`);
}

export async function cancelShift(formData: FormData) {
  await requireAdmin();
  const id = formData.get("shiftId");
  if (typeof id !== "string") return;
  await db.shift.update({ where: { id }, data: { cancelled: true } });
  revalidatePath("/admin");
  revalidatePath("/shifts");
  redirect("/admin");
}
