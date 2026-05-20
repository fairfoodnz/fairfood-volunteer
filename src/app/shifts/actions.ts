"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { sumBlocks } from "@/lib/shifts";
import { formatShiftRange, INCLUSIVE_SLUG } from "@/lib/programs";
import { buildICS, calendarLinks } from "@/lib/calendar";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { BookingStatus } from "@/generated/prisma";
import { appUrl } from "../../../emails/brand";
import { getPostHogClient } from "@/lib/posthog-server";

const BookSchema = z.object({
  shiftId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

const BookManySchema = z.object({
  shiftIds: z.array(z.string().min(1)).min(1).max(20),
});

export type BookState = {
  error?: string;
};

export type BookManyState = {
  error?: string;
  /** Per-shift failure reasons surfaced back to the listing. */
  failures?: { shiftId: string; reason: string }[];
};

export async function bookShiftAction(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const parsed = BookSchema.safeParse({
    shiftId: formData.get("shiftId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Something looked off — please try again." };

  const user = await currentUser();
  if (!user) {
    redirect(
      `/auth/sign-up?next=${encodeURIComponent(`/shifts/${parsed.data.shiftId}`)}`,
    );
  }
  if (!user.profileCompletedAt) {
    redirect(
      `/me/profile/complete?next=${encodeURIComponent(`/shifts/${parsed.data.shiftId}`)}`,
    );
  }
  if (!user.emailVerifiedAt) {
    return {
      error:
        "Please verify your email before booking — check your inbox for the link, or resend it from your dashboard.",
    };
  }

  const shift = await db.shift.findUnique({
    where: { id: parsed.data.shiftId },
    include: {
      _count: { select: { bookings: { where: { status: BookingStatus.CONFIRMED } } } },
      blocks: { select: { slots: true } },
      program: { select: { title: true, location: true, slug: true } },
    },
  });
  if (!shift) return { error: "Shift not found." };
  if (shift.cancelled) return { error: "Sorry — that shift was cancelled." };
  if (shift.program.slug === INCLUSIVE_SLUG) {
    return {
      error:
        "Inclusive volunteering is arranged directly with our team — email volunteering@fairfood.org.nz and we’ll set it up.",
    };
  }
  if (shift._count.bookings + sumBlocks(shift.blocks) >= shift.capacity) {
    return { error: "Sorry — that shift just filled up." };
  }
  if (shift.startsAt < new Date()) {
    return { error: "That shift has already started." };
  }

  let booking;
  try {
    booking = await db.booking.create({
      data: {
        userId: user.id,
        shiftId: shift.id,
        notes: parsed.data.notes,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique")) {
      return { error: "You've already booked this shift." };
    }
    throw e;
  }

  // Confirmation email is best-effort: the booking is already committed and is
  // the source of truth, so a Resend hiccup must not surface as a booking
  // failure. (Contrast password reset, where a dropped email breaks the
  // feature and so is allowed to throw.)
  try {
    const whenLabel = formatShiftRange(shift.startsAt, shift.endsAt);
    const manageUrl = `${appUrl}/me`;
    const calendarEvent = {
      uid: `booking-${booking.id}@volunteer.fairfood.org.nz`,
      title: `${shift.program.title} shift — Fair Food NZ`,
      description: [
        `You're volunteering with Fair Food NZ on the ${shift.program.title} programme.`,
        parsed.data.notes ? `Your note: ${parsed.data.notes}` : null,
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
      notes: parsed.data.notes,
      manageUrl,
      calendar: calendarLinks(calendarEvent),
      ics: buildICS(calendarEvent),
    });
  } catch (e) {
    console.error("Booking confirmation email failed to send:", e);
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "shift_booked",
    properties: {
      shift_id: shift.id,
      program_title: shift.program.title,
      program_slug: shift.program.slug,
      booking_id: booking.id,
    },
  });
  await posthog.flush();

  revalidatePath(`/shifts/${shift.id}`);
  revalidatePath(`/me`);
  redirect(`/me?booked=${shift.id}`);
}

/**
 * Books a set of shifts in one go from the /shifts listing. Mirrors the gating
 * of bookShiftAction (auth → profile → email), but folds per-shift failures
 * into a single state object so the volunteer sees what was confirmed and
 * what slipped (e.g. a shift filling up mid-checkout).
 */
export async function bookShiftsAction(
  _prev: BookManyState,
  formData: FormData,
): Promise<BookManyState> {
  const rawIds = formData
    .getAll("shiftId")
    .filter((v): v is string => typeof v === "string");
  // De-dupe in case the same checkbox somehow got submitted twice.
  const shiftIds = Array.from(new Set(rawIds));

  const parsed = BookManySchema.safeParse({ shiftIds });
  if (!parsed.success) {
    return {
      error:
        shiftIds.length > 20
          ? "Please book at most 20 shifts at a time."
          : "Pick at least one shift to book.",
    };
  }

  // Preserve the selection through any redirect so the volunteer doesn't have
  // to tick everything again after signing up / completing their profile.
  const returnTo = `/shifts?selected=${encodeURIComponent(parsed.data.shiftIds.join(","))}`;

  const user = await currentUser();
  if (!user) redirect(`/auth/sign-up?next=${encodeURIComponent(returnTo)}`);
  if (!user.profileCompletedAt) {
    redirect(`/me/profile/complete?next=${encodeURIComponent(returnTo)}`);
  }
  if (!user.emailVerifiedAt) {
    return {
      error:
        "Please verify your email before booking — check your inbox for the link, or resend it from your dashboard.",
    };
  }

  // KNOWN RACE (TOCTOU): the capacity check below reads counts from a snapshot
  // taken once before the loop, so two concurrent requests can both pass the
  // check for the last spot and over-book by one. The race already exists in
  // bookShiftAction (single shift); this version inherits it and widens the
  // window because creates are sequential. The proper fix — for both actions —
  // is an atomic INSERT … WHERE (filled + blocked) < capacity. Tracked as a
  // follow-up rather than landing it inside this UX change so both call sites
  // can move together.
  const shifts = await db.shift.findMany({
    where: { id: { in: parsed.data.shiftIds } },
    include: {
      _count: { select: { bookings: { where: { status: BookingStatus.CONFIRMED } } } },
      blocks: { select: { slots: true } },
      program: { select: { title: true, location: true, slug: true } },
    },
  });
  const byId = new Map(shifts.map((s) => [s.id, s]));

  const confirmed: { booking: { id: string }; shift: (typeof shifts)[number] }[] = [];
  const failures: { shiftId: string; reason: string }[] = [];
  const now = new Date();

  for (const id of parsed.data.shiftIds) {
    const shift = byId.get(id);
    if (!shift) {
      failures.push({ shiftId: id, reason: "Shift not found." });
      continue;
    }
    if (shift.cancelled) {
      failures.push({ shiftId: id, reason: "That shift was cancelled." });
      continue;
    }
    if (shift.program.slug === INCLUSIVE_SLUG) {
      failures.push({
        shiftId: id,
        reason:
          "Inclusive volunteering is arranged directly with our team — email volunteering@fairfood.org.nz.",
      });
      continue;
    }
    if (shift._count.bookings + sumBlocks(shift.blocks) >= shift.capacity) {
      failures.push({ shiftId: id, reason: "That shift just filled up." });
      continue;
    }
    if (shift.startsAt < now) {
      failures.push({ shiftId: id, reason: "That shift has already started." });
      continue;
    }

    try {
      // status defaults to CONFIRMED in the schema but we set it explicitly:
      // the listing's `myBookedShiftIds` filters on CONFIRMED, so this field
      // is part of the booking's observable contract — not an implementation
      // detail the schema default should hide.
      const booking = await db.booking.create({
        data: {
          userId: user.id,
          shiftId: shift.id,
          status: BookingStatus.CONFIRMED,
        },
      });
      confirmed.push({ booking, shift });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("Unique")) {
        failures.push({ shiftId: id, reason: "You'd already booked this one." });
      } else {
        failures.push({ shiftId: id, reason: "Something went wrong booking that shift." });
        console.error("bookShiftsAction booking failed:", id, e);
      }
    }
  }

  // Best-effort confirmations and analytics — never let an email/PostHog hiccup
  // surface as a booking failure when the rows are already committed.
  if (confirmed.length > 0) {
    const manageUrl = `${appUrl}/me`;
    await Promise.all(
      confirmed.map(async ({ booking, shift }) => {
        try {
          const whenLabel = formatShiftRange(shift.startsAt, shift.endsAt);
          const calendarEvent = {
            uid: `booking-${booking.id}@volunteer.fairfood.org.nz`,
            title: `${shift.program.title} shift — Fair Food NZ`,
            description: [
              `You're volunteering with Fair Food NZ on the ${shift.program.title} programme.`,
              `Manage your booking: ${manageUrl}`,
            ].join("\n\n"),
            location: shift.program.location,
            start: shift.startsAt,
            end: shift.endsAt,
            url: `${appUrl}/shifts/${shift.id}`,
          };
          await sendBookingConfirmationEmail({
            to: user.email,
            userName: user.name || undefined,
            programTitle: shift.program.title,
            whenLabel,
            location: shift.program.location,
            manageUrl,
            calendar: calendarLinks(calendarEvent),
            ics: buildICS(calendarEvent),
          });
        } catch (e) {
          console.error("Booking confirmation email failed to send:", e);
        }
      }),
    );

    try {
      const posthog = getPostHogClient();
      for (const { booking, shift } of confirmed) {
        posthog.capture({
          distinctId: user.id,
          event: "shift_booked",
          properties: {
            shift_id: shift.id,
            program_title: shift.program.title,
            program_slug: shift.program.slug,
            booking_id: booking.id,
            multi: true,
            batch_size: confirmed.length,
          },
        });
      }
      await posthog.flush();
    } catch (e) {
      console.error("PostHog flush failed for bookShiftsAction:", e);
    }

    for (const { shift } of confirmed) revalidatePath(`/shifts/${shift.id}`);
    revalidatePath("/shifts");
    revalidatePath("/me");
  }

  if (confirmed.length === 0) {
    // Nothing succeeded — keep the volunteer on /shifts with their selection
    // intact so they can adjust and retry.
    return {
      error:
        failures.length === 1
          ? failures[0]!.reason
          : "None of those shifts could be booked — see the cards for details.",
      failures,
    };
  }

  if (failures.length > 0) {
    // Surface partial success via query params so /me can render a banner.
    const failedIds = failures.map((f) => f.shiftId).join(",");
    redirect(
      `/me?bookedMany=${confirmed.length}&failedShifts=${encodeURIComponent(failedIds)}`,
    );
  }

  redirect(`/me?bookedMany=${confirmed.length}`);
}

export async function cancelBookingAction(formData: FormData) {
  const id = formData.get("bookingId");
  if (typeof id !== "string") return;
  const user = await currentUser();
  if (!user) return;
  const booking = await db.booking.findFirst({
    where: { id, userId: user.id },
    include: { shift: true },
  });
  if (!booking) return;
  await db.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "booking_cancelled",
    properties: { booking_id: booking.id, shift_id: booking.shiftId },
  });
  await posthog.flush();

  revalidatePath("/me");
  revalidatePath(`/shifts/${booking.shiftId}`);
}
