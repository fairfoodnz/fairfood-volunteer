"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fullName } from "@/lib/users";

const UserIdSchema = z.string().min(1);

const ReviewedSchema = z.object({
  userId: UserIdSchema,
  reviewed: z.boolean(),
});

export type FlagDisclosure = {
  fullName: string;
  email: string;
  phone: string | null;
  // Null when that question was answered "no". An empty string means they
  // answered "yes" and left the details blank.
  arrestDetails: string | null;
  healthDetails: string | null;
};

/**
 * What a volunteer disclosed, fetched only when a coordinator asks for it.
 * The list page never selects these columns, so the notes (and the contact
 * details that identify who wrote them) aren't in the HTML or the RSC payload
 * until someone clicks "Reveal" - a screen-share of the list leaks nothing.
 */
export async function revealFlagAction(
  userId: string,
): Promise<FlagDisclosure | null> {
  await requireAdmin();
  const user = await db.user.findUnique({
    where: { id: UserIdSchema.parse(userId) },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      arrestHistory: true,
      arrestDetails: true,
      healthConditions: true,
      healthDetails: true,
    },
  });
  if (!user) return null;
  return {
    fullName: fullName(user),
    email: user.email,
    phone: user.phone,
    arrestDetails: user.arrestHistory ? (user.arrestDetails?.trim() ?? "") : null,
    healthDetails: user.healthConditions
      ? (user.healthDetails?.trim() ?? "")
      : null,
  };
}

export async function setFlagReviewedAction(userId: string, reviewed: boolean) {
  await requireAdmin();
  // A Server Action is a callable endpoint - the `boolean` type only binds our
  // own client bundle, so a truthy string must not pass for "reviewed".
  const parsed = ReviewedSchema.parse({ userId, reviewed });
  await db.user.update({
    where: { id: parsed.userId },
    data: { flagReviewedAt: parsed.reviewed ? new Date() : null },
  });
  // The layout owns the sidebar's unreviewed badge, so refresh it too.
  revalidatePath("/admin", "layout");
}
