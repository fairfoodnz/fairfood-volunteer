"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { sumBlocks } from "@/lib/shifts";
import { BookingStatus } from "@/generated/prisma";

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

  const shift = await db.shift.findUnique({
    where: { id: parsed.data.shiftId },
    include: {
      _count: { select: { bookings: { where: { status: BookingStatus.CONFIRMED } } } },
      blocks: { select: { slots: true } },
    },
  });
  if (!shift) return { error: "Shift not found." };
  if (shift.cancelled) return { error: "Sorry — that shift was cancelled." };
  if (shift._count.bookings + sumBlocks(shift.blocks) >= shift.capacity) {
    return { error: "Sorry — that shift just filled up." };
  }
  if (shift.startsAt < new Date()) {
    return { error: "That shift has already started." };
  }

  try {
    await db.booking.create({
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
