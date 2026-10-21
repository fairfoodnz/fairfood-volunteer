"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { startImpersonation } from "@/lib/impersonation";
import { Role } from "@/generated/prisma";
import { resolveVolunteerQuery, type VolunteerQueryParams } from "./query";

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

export type RoleChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Grant or remove admin access. Returns a result rather than throwing so the
 * confirm dialog can show the reason — a thrown message is redacted in
 * production builds.
 */
export async function setVolunteerRoleAction(
  formData: FormData,
): Promise<RoleChangeResult> {
  const admin = await requireAdmin();
  const parsed = RoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: "Something was missing. Reload and try again." };
  // Don't let an admin lock themselves out.
  if (parsed.data.userId === admin.id && parsed.data.role !== Role.ADMIN) {
    return { ok: false, error: "You can't remove your own admin access." };
  }
  await db.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });
  revalidatePath(`/admin/volunteers/${parsed.data.userId}`);
  revalidatePath("/admin/volunteers");
  return { ok: true };
}

const AudienceSchema = z.object({
  q: z.string().max(200).optional(),
  filter: z.string().max(40).optional(),
  sort: z.string().max(40).optional(),
  programme: z.string().max(200).optional(),
  scope: z.string().max(40).optional(),
});

/**
 * Every email in the current Volunteers audience — not just the visible page —
 * so "Copy emails" matches what "Export CSV" downloads. Uses the same resolver
 * as the list and the export route.
 */
export async function matchingEmailsAction(
  params: VolunteerQueryParams,
): Promise<string[]> {
  await requireAdmin();
  const { where, orderBy } = resolveVolunteerQuery(AudienceSchema.parse(params));
  const users = await db.user.findMany({ where, orderBy, select: { email: true } });
  return users.map((u) => u.email);
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
