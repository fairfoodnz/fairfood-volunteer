"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { BookingStatus, ProgramSlug } from "@/generated/prisma";

const NewShiftSchema = z.object({
  programSlug: z.nativeEnum(ProgramSlug),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
});

export async function createShift(formData: FormData) {
  await requireAdmin();
  const parsed = NewShiftSchema.parse({
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

  const shift = await db.shift.create({
    data: {
      programId: program.id,
      startsAt: new Date(parsed.startsAt),
      endsAt: new Date(parsed.endsAt),
      capacity: parsed.capacity,
      notes: parsed.notes,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/shifts");
  redirect(`/admin/shifts/${shift.id}`);
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
