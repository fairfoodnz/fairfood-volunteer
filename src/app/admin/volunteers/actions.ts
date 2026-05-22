"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { startImpersonation } from "@/lib/impersonation";
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

const ImpersonateSchema = z.object({ userId: z.string().min(1) });

export type ImpersonateState = { error?: string };

/**
 * Swap the admin's session for a fresh, short-lived one belonging to the
 * target volunteer. The original admin session token is stashed in a separate
 * httpOnly cookie so the global banner's "Stop impersonating" button can
 * restore it. See src/lib/impersonation.ts for the full threat model.
 *
 * Returns a state object on failure (rendered by the form); on success
 * `redirect()` throws and the function never returns.
 */
export async function startImpersonationAction(
  _prev: ImpersonateState,
  formData: FormData,
): Promise<ImpersonateState> {
  const admin = await requireAdmin();
  const parsed = ImpersonateSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: "Pick a volunteer first." };

  const result = await startImpersonation(admin.id, parsed.data.userId);
  if (!result.ok) return { error: result.error };

  // Redirect to /me — that's where the impersonated volunteer would land
  // after sign-in, so it's the most useful starting point for "see what they
  // see". The banner is sticky on every page.
  redirect("/me");
}
