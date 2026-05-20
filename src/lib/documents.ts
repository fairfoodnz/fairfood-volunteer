import { DocumentCategory, DocumentVisibility } from "@/generated/prisma";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
]);

/**
 * Pick a safe Content-Type to *send* for a stored document. We never echo
 * the upload's MIME header verbatim — if a row's mimeType ever drifts off
 * the allowlist (manual DB edit, future ingestion path, etc.) we fall back
 * to `application/octet-stream` so the browser treats it as opaque. Combined
 * with `X-Content-Type-Options: nosniff`, this stops HTML/SVG masquerading
 * as `image/png` from being rendered as HTML on the app origin.
 */
export function safeServeMime(mime: string): string {
  return ALLOWED_MIME_TYPES.has(mime) ? mime : "application/octet-stream";
}

export const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  PUBLIC: "Public · anyone with the link",
  VOLUNTEER: "Volunteers · signed in",
  ADMIN: "Admins only",
};

export const VISIBILITY_ORDER: DocumentVisibility[] = [
  "PUBLIC",
  "VOLUNTEER",
  "ADMIN",
];

const EXT_FOR_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/plain": "txt",
};

export function extensionForMime(mime: string, fallbackFilename: string) {
  if (EXT_FOR_MIME[mime]) return EXT_FOR_MIME[mime];
  const dot = fallbackFilename.lastIndexOf(".");
  if (dot >= 0 && dot < fallbackFilename.length - 1) {
    return fallbackFilename.slice(dot + 1).toLowerCase();
  }
  return "bin";
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  HANDBOOK: "Handbooks",
  HEALTH_SAFETY: "Health & safety",
  GETTING_HERE: "Getting here",
  FORMS: "Forms",
  OTHER: "Other",
};

export const CATEGORY_ORDER: DocumentCategory[] = [
  "HANDBOOK",
  "HEALTH_SAFETY",
  "GETTING_HERE",
  "FORMS",
  "OTHER",
];

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
