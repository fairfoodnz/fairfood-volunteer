"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { BookingStatus } from "@/generated/prisma";

const NewShiftSchema = z.object({
  programSlug: z.string().min(1),
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
