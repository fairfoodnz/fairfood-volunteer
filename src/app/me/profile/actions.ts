"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, safeNextPath } from "@/lib/auth";
import { FirstNameSchema, LastNameSchema } from "@/lib/name-fields";

const ProfileSchema = z.object({
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  phone: z.string().trim().max(40).optional(),
  pronouns: z.string().trim().max(40).optional(),
  emergencyName: z.string().trim().max(120).optional(),
  emergencyPhone: z.string().trim().max(40).optional(),
  accessNeeds: z.string().trim().max(2000).optional(),
});

export type ProfileValues = {
  firstName: string;
  lastName: string;
  phone: string;
  pronouns: string;
  emergencyName: string;
  emergencyPhone: string;
  accessNeeds: string;
};

export type ProfileState = {
  ok?: boolean;
  fieldErrors?: Partial<Record<keyof ProfileValues, string>>;
  /** What was submitted, so React's post-action form reset keeps it on screen. */
  values?: ProfileValues;
};

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const text = (key: keyof ProfileValues) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const values: ProfileValues = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    phone: text("phone"),
    pronouns: text("pronouns"),
    emergencyName: text("emergencyName"),
    emergencyPhone: text("emergencyPhone"),
    accessNeeds: text("accessNeeds"),
  };

  const parsed = ProfileSchema.safeParse({
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phone: values.phone || undefined,
    pronouns: values.pronouns || undefined,
    emergencyName: values.emergencyName || undefined,
    emergencyPhone: values.emergencyPhone || undefined,
    accessNeeds: values.accessNeeds || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ProfileValues;
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors, values };
  }

  // Empty last name clears the column (mononym) rather than leaving the old value.
  await db.user.update({
    where: { id: user.id },
    data: { ...parsed.data, lastName: parsed.data.lastName || null },
  });
  revalidatePath("/me/profile");
  revalidatePath("/me");

  // Sent here mid-booking to fix their name: carry on to where they were going.
  const next = formData.get("next");
  if (typeof next === "string" && next) {
    redirect(safeNextPath(next));
  }
  return { ok: true, values };
}
