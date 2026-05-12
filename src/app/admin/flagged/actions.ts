"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function markFlagReviewedAction(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string") return;
  await db.user.update({
    where: { id: userId },
    data: { flagReviewedAt: new Date() },
  });
  revalidatePath("/admin/flagged");
}

export async function clearFlagReviewedAction(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string") return;
  await db.user.update({
    where: { id: userId },
    data: { flagReviewedAt: null },
  });
  revalidatePath("/admin/flagged");
}
