"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nzWallTimeToUtc } from "@/lib/schedule";
import { sumBlocks } from "@/lib/shifts";
import { formatShiftRange } from "@/lib/programs";
import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from "@/lib/email";
import { buildICS, calendarLinks } from "@/lib/calendar";
import { fullName } from "@/lib/users";
import { getPostHogClient } from "@/lib/posthog-server";
import { BookingStatus, Prisma, SlotBlockKind } from "@/generated/prisma";
import { appUrl } from "../../../emails/brand";

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
      user: { select: { email: true, firstName: true } },
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
        userName: existing.user.firstName || undefined,
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
  revalidatePath("/admin/shifts");
  revalidatePath("/shifts");
  redirect("/admin");
}

// --- Bulk shift operations -----------------------------------------------

const BulkShiftIdsSchema = z.object({
  shiftIds: z.array(z.string().min(1)).min(1).max(500),
});

export type BulkShiftResult = { ok?: boolean; error?: string; count?: number };

// Program slugs touched by these shifts, gathered *before* a destructive
// mutation so /programs/[slug] can still be revalidated after the rows (and
// their program link) are gone.
async function affectedProgramSlugs(shiftIds: string[]): Promise<string[]> {
  const rows = await db.shift.findMany({
    where: { id: { in: shiftIds } },
    select: { program: { select: { slug: true } } },
  });
  return [...new Set(rows.map((r) => r.program.slug))];
}

function revalidateShiftLists(slugs: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/shifts");
  revalidatePath("/shifts");
  revalidatePath("/me");
  for (const slug of slugs) revalidatePath(`/programs/${slug}`);
}

/**
 * Soft-cancel many shifts at once — the same `cancelled: true` flip as the
 * single-shift dialog, just batched. Already-cancelled shifts are skipped, so
 * the returned count is the number actually taken off the schedule.
 */
export async function bulkCancelShifts(
  shiftIds: string[],
): Promise<BulkShiftResult> {
  await requireAdmin();
  const parsed = BulkShiftIdsSchema.safeParse({ shiftIds });
  if (!parsed.success) return { error: "Select at least one shift." };

  const slugs = await affectedProgramSlugs(parsed.data.shiftIds);
  const { count } = await db.shift.updateMany({
    where: { id: { in: parsed.data.shiftIds }, cancelled: false },
    data: { cancelled: true },
  });

  revalidateShiftLists(slugs);
  return { ok: true, count };
}

/**
 * Permanently delete many shifts. Each shift's Booking and SlotBlock rows
 * cascade away with it (see prisma/schema.prisma) — irreversible, which is why
 * the UI guards it behind a typed confirmation.
 */
export async function bulkDeleteShifts(
  shiftIds: string[],
): Promise<BulkShiftResult> {
  await requireAdmin();
  const parsed = BulkShiftIdsSchema.safeParse({ shiftIds });
  if (!parsed.success) return { error: "Select at least one shift." };

  // Resolve slugs before the delete — afterwards the rows no longer exist.
  const slugs = await affectedProgramSlugs(parsed.data.shiftIds);
  const { count } = await db.shift.deleteMany({
    where: { id: { in: parsed.data.shiftIds } },
  });

  revalidateShiftLists(slugs);
  return { ok: true, count };
}

// --- Slot blocks: admin-held spots for off-platform groups ---------------

const SlotBlockSchema = z.object({
  shiftId: z.string().min(1),
  slots: z.coerce.number().int().min(1).max(500),
  kind: z.nativeEnum(SlotBlockKind).default(SlotBlockKind.OTHER),
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
    kind: formData.get("kind") ?? SlotBlockKind.OTHER,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { shiftId, slots, kind, note } = parsed.data;

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: { id: true, program: { select: { slug: true } } },
  });
  if (!shift) return { error: "That shift no longer exists." };

  await db.slotBlock.create({
    data: { shiftId, slots, kind, note: note ? note : null },
  });

  revalidatePath(`/admin/shifts/${shiftId}`);
  revalidatePath("/admin");
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${shiftId}`);
  // The programme detail page lists its upcoming shifts with a group pill
  // inline, so adding/removing a block must invalidate that page too.
  revalidatePath(`/programs/${shift.program.slug}`);
  return { ok: true };
}

export async function removeSlotBlock(formData: FormData) {
  await requireAdmin();
  const id = formData.get("blockId");
  if (typeof id !== "string" || !id) return;
  const block = await db.slotBlock.findUnique({
    where: { id },
    select: {
      shiftId: true,
      shift: { select: { program: { select: { slug: true } } } },
    },
  });
  if (!block) return;
  await db.slotBlock.delete({ where: { id } });
  revalidatePath(`/admin/shifts/${block.shiftId}`);
  revalidatePath("/admin");
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${block.shiftId}`);
  revalidatePath(`/programs/${block.shift.program.slug}`);
}

// --- Admin-assigned bookings --------------------------------------------

export type VolunteerSearchHit = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  /** Whether this user already holds a real spot on the shift (CONFIRMED/ATTENDED). */
  alreadyOnRoster: boolean;
  /** A prior CANCELLED/NO_SHOW booking on this shift — we can reinstate it. */
  reinstatable: boolean;
};

/**
 * Searches the volunteer pool for an admin-driven assignment. Returns up to 10
 * matches and annotates each one with whether they're already on this shift's
 * roster (so the picker can render the right CTA — "Already booked" vs "Add"
 * vs "Reinstate"). Empty query returns the most-recently-active volunteers as
 * a sensible default starting list.
 */
export async function searchAssignableVolunteers(
  shiftId: string,
  query: string,
): Promise<VolunteerSearchHit[]> {
  await requireAdmin();

  const search = query.trim();
  const where: Prisma.UserWhereInput = {};
  if (search) {
    const or: Prisma.UserWhereInput[] = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    const [first, ...rest] = search.split(/\s+/);
    if (first && rest.length > 0) {
      or.push({
        AND: [
          { firstName: { contains: first, mode: "insensitive" } },
          { lastName: { contains: rest.join(" "), mode: "insensitive" } },
        ],
      });
    }
    where.OR = or;
  }

  const users = await db.user.findMany({
    where,
    orderBy: search
      ? [{ firstName: "asc" }, { lastName: "asc" }]
      : [{ bookings: { _count: "desc" } }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      bookings: {
        where: { shiftId },
        select: { status: true },
        take: 1,
      },
    },
  });

  return users.map((u) => {
    const existing = u.bookings[0];
    const active =
      existing?.status === BookingStatus.CONFIRMED ||
      existing?.status === BookingStatus.ATTENDED;
    const reinstatable =
      existing?.status === BookingStatus.CANCELLED ||
      existing?.status === BookingStatus.NO_SHOW;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      alreadyOnRoster: active,
      reinstatable,
    };
  });
}

const AssignBookingSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AssignBookingState = {
  error?: string;
  /** A short success message — shown in the dialog before it closes. */
  ok?: string;
};

/**
 * Coordinator-driven booking: places a volunteer on a shift without going
 * through the public /shifts flow. Mirrors the same gates as `bookShiftAction`
 * (cancelled / full / in the past), with the same TOCTOU window on capacity.
 *
 * The unique `(userId, shiftId)` constraint means we can't blindly INSERT — if
 * the volunteer once held this shift and later cancelled or no-showed, the
 * row is still there. We reinstate it by flipping the status back to
 * CONFIRMED; this preserves history (no duplicate Booking rows) and lets the
 * coordinator re-add someone who pulled out earlier.
 *
 * Email is best-effort and opt-in via a "Notify" checkbox in the dialog —
 * absent field means silent (e.g. coordinator is just recording a manual
 * booking).
 */
export async function assignBookingAction(
  _prev: AssignBookingState,
  formData: FormData,
): Promise<AssignBookingState> {
  const admin = await requireAdmin();
  const parsed = AssignBookingSchema.safeParse({
    shiftId: formData.get("shiftId"),
    userId: formData.get("userId"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: "Something looked off — please try again." };
  }
  const shouldNotify = formData.get("notify") != null;
  const { shiftId, userId } = parsed.data;
  const notes = parsed.data.notes ? parsed.data.notes : null;

  const [shift, user] = await Promise.all([
    db.shift.findUnique({
      where: { id: shiftId },
      include: {
        _count: {
          select: {
            // ATTENDED bookings also hold a spot (see ACTIVE_BOOKING_STATUSES
            // / shiftAvailability) — counting CONFIRMED alone could
            // undercount when coordinators mark attendance before start.
            bookings: {
              where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
            },
          },
        },
        blocks: { select: { slots: true } },
        program: { select: { title: true, location: true, slug: true } },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
  ]);

  if (!shift) return { error: "That shift no longer exists." };
  if (!user) return { error: "That volunteer no longer exists." };
  if (shift.cancelled) return { error: "That shift was cancelled." };
  if (shift.startsAt < new Date()) {
    return { error: "That shift has already started — assignments must be made in advance." };
  }

  const existing = await db.booking.findUnique({
    where: { userId_shiftId: { userId, shiftId } },
    select: { id: true, status: true },
  });

  // Capacity check needs to account for the existing booking: a reinstatement
  // of a CANCELLED row doesn't add a new spot to the count yet, but a fresh
  // create does. Recompute "held" with that in mind.
  const held = shift._count.bookings + sumBlocks(shift.blocks);
  if (held >= shift.capacity) {
    return {
      error:
        "This shift is full. Cancel a booking, remove a slot block, or raise the capacity first.",
    };
  }

  let bookingId: string;
  let reinstated = false;
  if (existing) {
    if (
      existing.status === BookingStatus.CONFIRMED ||
      existing.status === BookingStatus.ATTENDED
    ) {
      return { error: `${fullName(user)} is already on this roster.` };
    }
    const updated = await db.booking.update({
      where: { id: existing.id },
      data: {
        status: BookingStatus.CONFIRMED,
        // Pass `notes` directly (string | null) so an empty field clears any
        // note from the prior cancelled booking — `?? undefined` would skip
        // the column update and silently preserve stale text.
        notes,
      },
    });
    bookingId = updated.id;
    reinstated = true;
  } else {
    try {
      const created = await db.booking.create({
        data: {
          userId,
          shiftId,
          status: BookingStatus.CONFIRMED,
          notes,
        },
      });
      bookingId = created.id;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("Unique")) {
        // Concurrent admin assignment beat us — surface a clear message.
        return { error: `${fullName(user)} is already on this roster.` };
      }
      throw e;
    }
  }

  // Best-effort confirmation email — the booking is committed, so a Resend
  // hiccup must not surface as a failed assignment.
  if (shouldNotify) {
    try {
      const whenLabel = formatShiftRange(shift.startsAt, shift.endsAt);
      const manageUrl = `${appUrl}/me`;
      const calendarEvent = {
        uid: `booking-${bookingId}@volunteer.fairfood.org.nz`,
        title: `${shift.program.title} shift — Fair Food NZ`,
        description: [
          `A Fair Food coordinator has added you to the ${shift.program.title} shift.`,
          notes ? `Coordinator note: ${notes}` : null,
          `Manage your booking: ${manageUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        location: shift.program.location,
        start: shift.startsAt,
        end: shift.endsAt,
        url: `${appUrl}/shifts/${shift.id}`,
      };
      await sendBookingConfirmationEmail({
        to: user.email,
        userName: user.firstName || undefined,
        programTitle: shift.program.title,
        whenLabel,
        location: shift.program.location,
        notes: notes ?? undefined,
        manageUrl,
        calendar: calendarLinks(calendarEvent),
        ics: buildICS(calendarEvent),
      });
    } catch (e) {
      console.error("Admin-assigned booking confirmation email failed:", e);
    }
  }

  try {
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: admin.id,
      event: "shift_admin_assigned",
      properties: {
        shift_id: shift.id,
        booking_id: bookingId,
        volunteer_id: user.id,
        program_slug: shift.program.slug,
        notified: shouldNotify,
        reinstated,
      },
    });
    await posthog.flush();
  } catch (e) {
    console.error("PostHog capture failed for assignBookingAction:", e);
  }

  revalidatePath(`/admin/shifts/${shiftId}`);
  revalidatePath("/admin");
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${shiftId}`);
  revalidatePath("/me");
  revalidatePath(`/programs/${shift.program.slug}`);

  return {
    ok: reinstated
      ? `${fullName(user)} is back on the roster.`
      : `${fullName(user)} added to the roster${shouldNotify ? " — confirmation email on its way." : "."}`,
  };
}
