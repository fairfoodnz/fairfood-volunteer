"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, startSignIn } from "@/lib/auth";
import { BookingStatus } from "@/generated/prisma";

const BookSchema = z.object({
  shiftId: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type BookState = {
  ok?: boolean;
  error?: string;
  needsSignIn?: boolean;
  magicLink?: string;
};

export async function bookShiftAction(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const parsed = BookSchema.safeParse({
    shiftId: formData.get("shiftId"),
    email: formData.get("email") || undefined,
    name: formData.get("name") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please fill in your name and email." };

  const shift = await db.shift.findUnique({
    where: { id: parsed.data.shiftId },
    include: {
      _count: { select: { bookings: { where: { status: BookingStatus.CONFIRMED } } } },
    },
  });
  if (!shift) return { error: "Shift not found." };
  if (shift.cancelled) return { error: "Sorry — that shift was cancelled." };
  if (shift._count.bookings >= shift.capacity) {
    return { error: "Sorry — that shift just filled up." };
  }
  if (shift.startsAt < new Date()) {
    return { error: "That shift has already started." };
  }

  const user = await currentUser();
  if (user) {
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
        return { error: "You&rsquo;ve already booked this shift." };
      }
      throw e;
    }
    revalidatePath(`/shifts/${shift.id}`);
    revalidatePath(`/me`);
    redirect(`/me?booked=${shift.id}`);
  }

  if (!parsed.data.email || !parsed.data.name) {
    return { needsSignIn: true };
  }

  // Anonymous booking flow: create user + booking, then magic-link them in.
  const lower = parsed.data.email.toLowerCase().trim();
  const u = await db.user.upsert({
    where: { email: lower },
    update: { name: parsed.data.name },
    create: { email: lower, name: parsed.data.name },
  });

  try {
    await db.booking.create({
      data: { userId: u.id, shiftId: shift.id, notes: parsed.data.notes },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (!message.includes("Unique")) throw e;
  }

  const { link } = await startSignIn(lower, parsed.data.name);
  revalidatePath(`/shifts/${shift.id}`);
  return {
    ok: true,
    magicLink: process.env.NODE_ENV === "production" ? undefined : link,
  };
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
