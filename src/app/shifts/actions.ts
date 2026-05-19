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

const BookSchema = z.object({
  shiftId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

export type BookState = {
  error?: string;
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
      userName: user.name || undefined,
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

  revalidatePath(`/shifts/${shift.id}`);
  revalidatePath(`/me`);
  redirect(`/me?booked=${shift.id}`);
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
  revalidatePath("/me");
  revalidatePath(`/shifts/${booking.shiftId}`);
}
