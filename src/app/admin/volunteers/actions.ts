"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Role } from "@/generated/prisma";

const NotesSchema = z.object({
  userId: z.string().min(1),
  notes: z.string().trim().max(2000),
});

export async function updateVolunteerNotesAction(formData: FormData) {
  await requireAdmin();
  const parsed = NotesSchema.parse({
    userId: formData.get("userId"),
    notes: (formData.get("notes") as string | null) ?? "",
  });
  await db.user.update({
    where: { id: parsed.userId },
    data: { notes: parsed.notes.length > 0 ? parsed.notes : null },
  });
  revalidatePath(`/admin/volunteers/${parsed.userId}`);
  revalidatePath("/admin/volunteers");
}

const RoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

export async function setVolunteerRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = RoleSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  // Don't let an admin lock themselves out.
  if (parsed.userId === admin.id && parsed.role !== Role.ADMIN) {
    throw new Error("You can't remove your own admin access.");
  }
  await db.user.update({
    where: { id: parsed.userId },
    data: { role: parsed.role },
  });
  revalidatePath(`/admin/volunteers/${parsed.userId}`);
  revalidatePath("/admin/volunteers");
}
