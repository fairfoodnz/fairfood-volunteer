"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SITE_COPY, SITE_COPY_KEYS, type SiteCopyKey } from "@/lib/site-copy";

export type SiteCopyState = {
  ok?: boolean;
  fieldErrors?: Partial<Record<SiteCopyKey, string>>;
  /** What was submitted, so a failed save keeps the edits on screen. */
  values?: Record<SiteCopyKey, string>;
};

export async function saveSiteCopyAction(
  _prev: SiteCopyState,
  formData: FormData,
): Promise<SiteCopyState> {
  const admin = await requireAdmin();

  const values = Object.fromEntries(
    SITE_COPY_KEYS.map((key) => {
      const raw = formData.get(key);
      return [key, typeof raw === "string" ? raw.trim() : ""];
    }),
  ) as Record<SiteCopyKey, string>;

  const fieldErrors: SiteCopyState["fieldErrors"] = {};
  for (const key of SITE_COPY_KEYS) {
    const max = SITE_COPY[key].maxLength;
    if (values[key].length > max) {
      fieldErrors[key] = `That's ${values[key].length} characters — keep it under ${max}.`;
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // An empty box is a reset, not a blank string: dropping the row puts the
  // shipped wording back rather than leaving a volunteer-facing note empty.
  await db.$transaction(
    SITE_COPY_KEYS.map((key) =>
      values[key]
        ? db.siteSetting.upsert({
            where: { key },
            create: { key, value: values[key], updatedById: admin.id },
            update: { value: values[key], updatedById: admin.id },
          })
        : db.siteSetting.deleteMany({ where: { key } }),
    ),
  );

  revalidatePath("/admin/settings");
  return { ok: true, values };
}
