"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify, INCLUSIVE_SLUG } from "@/lib/programs";
import { isThemeKey, DEFAULT_THEME } from "@/lib/programme-theme";
import { bufferMatchesMime } from "@/lib/file-sniff";
import { deleteObject, putObject } from "@/lib/s3";

export type ProgrammeFormState = { error?: string; ok?: boolean };

const DEFAULT_LOCATION = "624 Rosebank Road, Avondale, Tāmaki Makaurau";

const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FieldsSchema = z.object({
  title: z.string().trim().min(1, "Give the programme a title.").max(120),
  tagline: z
    .string()
    .trim()
    .min(1, "Add a short tagline — it shows on every card.")
    .max(80),
  description: z
    .string()
    .trim()
    .min(1, "Add a description.")
    .max(2000),
  schedule: z.string().trim().max(40).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("That contact email doesn’t look right.")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  gettingHere: z.string().trim().max(1000).optional().or(z.literal("")),
  theme: z.string().trim(),
  order: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

type Fields = z.infer<typeof FieldsSchema>;

function parseFields(formData: FormData) {
  return FieldsSchema.safeParse({
    title: formData.get("title"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    schedule: formData.get("schedule") ?? "",
    location: formData.get("location") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    gettingHere: formData.get("gettingHere") ?? "",
    theme: formData.get("theme") ?? DEFAULT_THEME,
    order: formData.get("order") || 0,
    // Unchecked checkboxes are absent from FormData.
    active: formData.get("active") != null,
  });
}

/** Slugify the title, then suffix -2, -3… until it's unique. */
async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "programme";
  let candidate = base;
  let n = 1;
  // Bounded — titles are <=120 chars so collisions are rare in practice.
  while (n < 100) {
    const clash = await db.program.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Upload a programme image to Garage. Returns null if no file was supplied. */
async function uploadImage(
  formData: FormData,
): Promise<{ imageKey: string } | { error: string } | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "That image is bigger than 5 MB — please compress it." };
  }
  const ext = IMAGE_MIME_EXT[file.type];
  if (!ext) {
    return { error: "Images must be JPEG, PNG, WebP or GIF." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // file.type is browser-supplied — verify the magic bytes match before we
  // store anything. Stops HTML/SVG masquerading as image/png from ever
  // landing in object storage and being served from the app origin.
  if (!bufferMatchesMime(buffer, file.type)) {
    return {
      error: "That image's contents don't match its file type. Try re-exporting it.",
    };
  }
  const imageKey = `programmes/${randomUUID()}.${ext}`;
  await putObject({ key: imageKey, body: buffer, contentType: file.type });
  return { imageKey };
}

function dataFromFields(f: Fields) {
  return {
    title: f.title,
    tagline: f.tagline,
    description: f.description,
    schedule: f.schedule || null,
    location: f.location ? f.location : DEFAULT_LOCATION,
    contactEmail: f.contactEmail || null,
    contactPhone: f.contactPhone || null,
    gettingHere: f.gettingHere || null,
    theme: isThemeKey(f.theme) ? f.theme : DEFAULT_THEME,
    order: f.order,
    active: f.active,
  };
}

export async function createProgramme(
  _prev: ProgrammeFormState,
  formData: FormData,
): Promise<ProgrammeFormState> {
  await requireAdmin();

  const parsed = parseFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const image = await uploadImage(formData);
  if (image && "error" in image) return { error: image.error };

  const slug = await uniqueSlug(parsed.data.title);

  try {
    await db.program.create({
      data: {
        ...dataFromFields(parsed.data),
        slug,
        imageKey: image?.imageKey ?? null,
        imageUrl: null,
      },
    });
  } catch (err) {
    if (image) await deleteObject(image.imageKey).catch(() => {});
    throw err;
  }

  revalidatePath("/admin/programmes");
  revalidatePath("/programs");
  revalidatePath("/");
  redirect("/admin/programmes");
}

export async function updateProgramme(
  _prev: ProgrammeFormState,
  formData: FormData,
): Promise<ProgrammeFormState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing programme id." };

  const existing = await db.program.findUnique({ where: { id } });
  if (!existing) return { error: "That programme no longer exists." };

  const parsed = parseFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const image = await uploadImage(formData);
  if (image && "error" in image) return { error: image.error };

  // Keep the slug stable once published so existing links don't break; only
  // re-derive it if the title changed and nothing currently points at it.
  // The inclusive slug is referenced in application code (the enquiry-only
  // gate keys off `slug === INCLUSIVE_SLUG`), so it must never be re-derived
  // by a title change — that would silently re-enable self-serve booking.
  const slug =
    existing.slug === INCLUSIVE_SLUG
      ? existing.slug
      : parsed.data.title !== existing.title
        ? await uniqueSlug(parsed.data.title, id)
        : existing.slug;

  try {
    await db.program.update({
      where: { id },
      data: {
        ...dataFromFields(parsed.data),
        slug,
        ...(image
          ? { imageKey: image.imageKey, imageUrl: null }
          : {}),
      },
    });
  } catch (err) {
    if (image) await deleteObject(image.imageKey).catch(() => {});
    throw err;
  }

  // Replaced the image — bin the old object (best effort).
  if (image && existing.imageKey) {
    await deleteObject(existing.imageKey).catch(() => {});
  }

  revalidatePath("/admin/programmes");
  revalidatePath(`/admin/programmes/${id}`);
  revalidatePath("/programs");
  revalidatePath(`/programs/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProgramme(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const program = await db.program.findUnique({
    where: { id },
    select: { imageKey: true, _count: { select: { shifts: true } } },
  });
  if (!program) return;

  // Deleting a programme cascades to its shifts and their bookings — too
  // destructive to do silently. Coordinators should deactivate instead.
  if (program._count.shifts > 0) {
    redirect(`/admin/programmes/${id}?error=has-shifts`);
  }

  await db.program.delete({ where: { id } });
  if (program.imageKey) await deleteObject(program.imageKey).catch(() => {});

  revalidatePath("/admin/programmes");
  revalidatePath("/programs");
  revalidatePath("/");
  redirect("/admin/programmes");
}
