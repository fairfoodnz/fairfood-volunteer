"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  extensionForMime,
} from "@/lib/documents";
import { bufferMatchesMime } from "@/lib/file-sniff";
import { deleteObject, putObject } from "@/lib/s3";
import { DocumentCategory, DocumentVisibility } from "@/generated/prisma";

export type UploadState = {
  error?: string;
  ok?: boolean;
};

const UploadSchema = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  category: z.nativeEnum(DocumentCategory),
  visibility: z.nativeEnum(DocumentVisibility),
});

export async function uploadDocumentAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file first." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: "That file is bigger than 25 MB — please compress it or split it up.",
    };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      error: "We can only take PDFs, Word docs, and images right now.",
    };
  }

  const parsed = UploadSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    visibility: formData.get("visibility") ?? DocumentVisibility.VOLUNTEER,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // file.type is set by the browser and can lie. Verify the magic bytes
  // match the declared MIME before we touch storage — stops a renamed
  // .html / .svg from landing in object storage labelled as image/png.
  if (!bufferMatchesMime(buffer, file.type)) {
    return {
      error: "That file's contents don't match its file type. Re-export it and try again.",
    };
  }

  const ext = extensionForMime(file.type, file.name);
  const objectKey = `documents/${randomUUID()}.${ext}`;

  await putObject({ key: objectKey, body: buffer, contentType: file.type });

  try {
    await db.document.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        visibility: parsed.data.visibility,
        objectKey,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: admin.id,
      },
    });
  } catch (err) {
    // DB write failed after object landed — clean up the orphaned object.
    await deleteObject(objectKey).catch(() => {});
    throw err;
  }

  revalidatePath("/admin/documents");
  revalidatePath("/resources");
  return { ok: true };
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await db.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/documents");
  revalidatePath("/resources");
}

