"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nzWallTimeToUtc } from "@/lib/schedule";
import { sumBlocks } from "@/lib/shifts";
import { formatShiftRange } from "@/lib/programs";
import { sendBookingCancellationEmail } from "@/lib/email";
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

  // Don't let capacity drop below spots already held — confirmed volunteers
  // AND admin slot blocks both consume capacity (see src/lib/shifts.ts), so
  // ignoring either would silently over-hold the roster.
  const [bookedCount, blocks] = await Promise.all([
    db.booking.count({
      where: {
        shiftId: parsed.shiftId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    }),
    db.slotBlock.findMany({
      where: { shiftId: parsed.shiftId },
      select: { slots: true },
    }),
  ]);
  const blocked = sumBlocks(blocks);
  const held = bookedCount + blocked;
  if (parsed.capacity < held) {
    throw new Error(
      `Capacity can't be lower than the ${held} spot${held === 1 ? "" : "s"} already held (${bookedCount} booked${blocked > 0 ? `, ${blocked} blocked` : ""}). Remove a booking or slot block first, or pick a higher number.`,
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

  // The cancel-booking confirmation dialog sends a "notify" checkbox (default
  // checked); admins can untick it for a silent cancellation. Absent field
  // (e.g. the other status buttons) counts as "don't notify" — those never
  // transition into cancelled anyway, so the email path stays unreached.
  const notify = formData.get("notify") != null;

  const existing = await db.booking.findUnique({
    where: { id: parsed.bookingId },
    include: {
      user: { select: { email: true, name: true } },
      shift: {
        include: {
          program: { select: { title: true, location: true, slug: true } },
        },
      },
    },
  });
  if (!existing) return;

  const booking = await db.booking.update({
    where: { id: parsed.bookingId },
    data: { status: parsed.status },
  });

  // Tell the volunteer when an admin cancels their booking — they didn't do
  // it themselves, so they need to know their spot is gone. Only on the
  // transition *into* cancelled (re-cancelling an already-cancelled booking
  // shouldn't re-send), and only when the admin chose to notify them.
  // Best-effort: the status change is already committed, so a Resend hiccup
  // must not surface as a failed admin action.
  if (
    notify &&
    parsed.status === BookingStatus.CANCELLED &&
    existing.status !== BookingStatus.CANCELLED
  ) {
    try {
      await sendBookingCancellationEmail({
        to: existing.user.email,
        userName: existing.user.name || undefined,
        programTitle: existing.shift.program.title,
        whenLabel: formatShiftRange(
          existing.shift.startsAt,
          existing.shift.endsAt,
        ),
        location: existing.shift.program.location,
      });
    } catch (e) {
      console.error("Booking cancellation email failed to send:", e);
    }
  }

  // Every status transition (cancel / attended / no-show / reinstate) changes
  // the shift's effective availability, so refresh the volunteer-facing views
  // too — the same routes src/app/shifts/actions.ts revalidates after a
  // booking mutation, plus the programme detail page that lists the shift.
  revalidatePath(`/admin/shifts/${booking.shiftId}`);
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${booking.shiftId}`);
  revalidatePath("/me");
  revalidatePath(`/programs/${existing.shift.program.slug}`);
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

// --- Slot blocks: admin-held spots for off-platform groups ---------------

const SlotBlockSchema = z.object({
  shiftId: z.string().min(1),
  slots: z.coerce.number().int().min(1).max(500),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SlotBlockState = { error?: string; ok?: boolean };

export async function addSlotBlock(
  _prev: SlotBlockState,
  formData: FormData,
): Promise<SlotBlockState> {
  await requireAdmin();
  const parsed = SlotBlockSchema.safeParse({
    shiftId: formData.get("shiftId"),
    slots: formData.get("slots"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { shiftId, slots, note } = parsed.data;

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: { id: true },
  });
  if (!shift) return { error: "That shift no longer exists." };

  await db.slotBlock.create({
    data: { shiftId, slots, note: note ? note : null },
  });

  revalidatePath(`/admin/shifts/${shiftId}`);
  revalidatePath("/admin");
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${shiftId}`);
  return { ok: true };
}

export async function removeSlotBlock(formData: FormData) {
  await requireAdmin();
  const id = formData.get("blockId");
  if (typeof id !== "string" || !id) return;
  const block = await db.slotBlock.findUnique({
    where: { id },
    select: { shiftId: true },
  });
  if (!block) return;
  await db.slotBlock.delete({ where: { id } });
  revalidatePath(`/admin/shifts/${block.shiftId}`);
  revalidatePath("/admin");
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${block.shiftId}`);
}
