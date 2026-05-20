import "server-only";
import Papa from "papaparse";
// `readSheet` is the single-sheet variant that returns `SheetData` (i.e.
// rows directly). The default `readXlsxFile` export wraps that in a Sheet[]
// for multi-sheet workbooks, which we don't need — coordinators export a
// single tab from Numbers/Excel.
import { readSheet, type SheetData } from "read-excel-file/node";
import { z } from "zod";

/**
 * Volunteer roster importer.
 *
 * Coordinators export rosters from Apple Numbers / Excel / Google Sheets into
 * CSV or XLSX and drop them into the admin import page. This module owns the
 * full pipeline from raw bytes → normalized row preview → DB upsert candidates.
 *
 * The pipeline is intentionally split into pure-ish steps so the page can run
 * `parseBuffer → normalize` once for the preview (no DB writes), then re-run
 * the same steps on confirm and merge against `existing` (a snapshot fetched
 * inside the same server action). Re-parsing on confirm — rather than trusting
 * client-roundtripped JSON — keeps the source of truth on disk: we only ever
 * insert what's actually in the file the admin uploaded.
 *
 * Mapping rules (see `HEADER_ALIASES`):
 *   First / First Name              → firstName       (required)
 *   Last / Last Name / Surname      → lastName
 *   Email / Email(s) / E-mail       → email           (required; first valid wins)
 *   Phone / Mobile / Cell           → phone
 *   Phone Type                      → noted alongside phone in `notes`
 *   Address1, Address2, City,
 *     State, Postal Code, Country   → flattened into a single `Address:` line in `notes`
 *   Hours                           → "Previously logged: Xh" line in `notes`
 *
 * Anything we don't have a User-model home for is collapsed into the free-text
 * `notes` field (coordinator-only, never shown to the volunteer). Keeping a
 * trail there means no roster data is silently dropped at import time.
 */

/** Cap upload size before we touch the parsers — gives a clean 413-style error
 *  rather than letting papaparse/read-excel-file run on a 100MB blob. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Cap row count post-parse — guards against a CSV with millions of empty rows
 *  blowing the action's memory. A real coordinator roster is in the hundreds. */
export const MAX_ROWS = 5_000;

/** Mime types we accept on the upload input. */
export const ACCEPTED_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel", // some older CSV exports
  "application/vnd.openxmlformats-officedirectory.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx (canonical)
];

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const;

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

/**
 * Canonical fields → header strings the importer will recognise. Matched
 * case-insensitively after stripping non-alphanumerics, so "Phone Number",
 * "phone_number", "PHONE-NUMBER" all collapse to the same key.
 */
const HEADER_ALIASES: Record<string, readonly string[]> = {
  firstName: ["first", "firstname", "givenname", "fname"],
  lastName: ["last", "lastname", "surname", "familyname", "lname"],
  email: ["email", "emails", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "mobilephone", "cellphone", "cell", "tel"],
  phoneType: ["phonetype"],
  address1: ["address1", "address", "street", "streetaddress", "addressline1"],
  address2: ["address2", "addressline2", "suburb", "apt", "unit"],
  city: ["city", "town"],
  state: ["state", "region", "province"],
  postalCode: ["postalcode", "postcode", "zip", "zipcode"],
  country: ["country", "countrycode"],
  hours: ["hours", "totalhours", "loggedhours", "hourslogged"],
};

type CanonicalField = keyof typeof HEADER_ALIASES;

function normaliseHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Build a `headerIndex[canonicalField] = columnIndex` map from the parsed
 * header row. Unknown columns are silently ignored (`headerIndex[x]` undefined)
 * which is what we want — extra columns shouldn't fail the import.
 */
function buildHeaderIndex(headers: readonly string[]): Partial<Record<CanonicalField, number>> {
  const index: Partial<Record<CanonicalField, number>> = {};
  headers.forEach((raw, i) => {
    const slug = normaliseHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [CanonicalField, readonly string[]][]) {
      if (index[field] === undefined && aliases.includes(slug)) {
        index[field] = i;
      }
    }
  });
  return index;
}

// ---------------------------------------------------------------------------
// Parse: file bytes → raw rows
// ---------------------------------------------------------------------------

/**
 * Decode `buffer` as either CSV or XLSX and return `{ headers, rows }`. Rows
 * are arrays of cell strings (already trimmed); empty trailing rows are
 * dropped. Throws a friendly Error when the file is unreadable so callers can
 * surface a single message.
 */
export async function parseBuffer(
  buffer: Buffer,
  filename: string,
): Promise<{ headers: string[]; rows: string[][] }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return parseXlsx(buffer);
  }
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    return parseCsv(buffer);
  }
  // Fall back on content sniff — XLSX is a zip ("PK\x03\x04"), anything else
  // we try as CSV.
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return parseXlsx(buffer);
  }
  return parseCsv(buffer);
}

async function parseCsv(buffer: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
  // skipEmptyLines drops blank rows mid-file (Numbers exports often leave a
  // trailing one). transform trims every cell so we don't carry whitespace
  // into validation.
  const text = buffer.toString("utf-8");
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });
  if (result.errors.length) {
    const first = result.errors[0];
    throw new Error(
      `Couldn't read the CSV — ${first.message}${first.row !== undefined ? ` (row ${first.row + 1})` : ""}.`,
    );
  }
  const data = result.data.filter((r) => r.some((c) => c && c.length > 0));
  if (data.length === 0) {
    throw new Error("The CSV is empty.");
  }
  const [headers, ...rows] = data;
  return { headers: headers ?? [], rows };
}

async function parseXlsx(buffer: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
  // read-excel-file's `readSheet` returns SheetData — a (CellValue)[][], where
  // CellValue is already typed (string | number | boolean | Date | null). We
  // coerce every cell to a trimmed string so downstream code is uniform with
  // the CSV path: dates → ISO, numbers → toString(), nulls → "".
  // readSheet has overloads — the no-options call resolves to the
  // schema-based one in TS even though at runtime it's the simple
  // SheetData<number> return. Annotate to pin the overload.
  let raw: SheetData<number>;
  try {
    raw = (await readSheet(buffer)) as SheetData<number>;
  } catch (err) {
    throw new Error(
      `Couldn't read the spreadsheet — ${err instanceof Error ? err.message : "unknown error"}.`,
    );
  }
  if (raw.length === 0) {
    throw new Error("The spreadsheet is empty.");
  }
  const stringify = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString();
    return String(v).trim();
  };
  const [headerRow, ...rest] = raw;
  const headers = (headerRow ?? []).map(stringify);
  const rows = rest
    .map((r) => r.map(stringify))
    .filter((r) => r.some((c) => c.length > 0));
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Normalise: raw rows → preview rows (validated, mapped to User fields)
// ---------------------------------------------------------------------------

export type ImportStatus = "new" | "existing" | "skip" | "error";

export type ImportPreviewRow = {
  /** 1-based row number as it appears in the source spreadsheet (excl. header). */
  rowNumber: number;
  status: ImportStatus;
  /** Reason a row is `skip`/`error` (e.g. "Email already in use", "Missing first name"). */
  reason?: string;
  /** Mapped User fields. Always present even for `error` rows — we still show
   *  what we managed to extract so the admin can fix the source file. */
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  notes: string | null;
};

/** Schema for a row's email/name fields — kept minimal so we never reject a
 *  roster over a stray pronoun. Address etc. are non-validated text fed into
 *  the notes formatter. */
const RowSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().trim().min(1, "Missing first name").max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
});

/**
 * Pull the first plausible email out of a cell. Spreadsheet exports often pack
 * multiple emails ("a@x.com, b@y.com" or "a@x.com; b@y.com" or one per line),
 * with the primary always first. We take the first that looks like an email
 * and squirrel the rest away into a notes line if there's more than one.
 */
function splitEmails(raw: string): { primary: string | null; extras: string[] } {
  if (!raw) return { primary: null, extras: [] };
  const candidates = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const valid = candidates.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
  if (valid.length === 0) return { primary: null, extras: [] };
  const [primary, ...extras] = valid;
  return { primary: primary.toLowerCase(), extras };
}

/**
 * Stitch the address columns, phone type, hours, and extra emails into a
 * single readable notes blob. Returns null when there's nothing of substance
 * to record — we avoid setting User.notes to "" so the field stays a useful
 * signal of "admin has actually written something here".
 */
function buildNotes(parts: {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneType?: string;
  hours?: string;
  extraEmails: string[];
}): string | null {
  const lines: string[] = [];
  const addressBits = [
    parts.address1,
    parts.address2,
    [parts.city, parts.state].filter(Boolean).join(", "),
    parts.postalCode,
    parts.country,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  if (addressBits.length) {
    lines.push(`Address: ${addressBits.join(", ")}`);
  }
  if (parts.phoneType?.trim()) {
    lines.push(`Phone type: ${parts.phoneType.trim()}`);
  }
  const hoursNum = parts.hours ? Number.parseFloat(parts.hours) : NaN;
  if (Number.isFinite(hoursNum) && hoursNum > 0) {
    // Strip trailing .0 so "20" stays "20" rather than "20.0".
    const pretty = Number.isInteger(hoursNum) ? String(hoursNum) : hoursNum.toFixed(1);
    lines.push(`Previously logged: ${pretty}h`);
  }
  if (parts.extraEmails.length) {
    lines.push(`Other emails on file: ${parts.extraEmails.join(", ")}`);
  }
  return lines.length ? lines.join("\n") : null;
}

/**
 * Map a single raw row to an `ImportPreviewRow`. Pure — no DB calls. Status is
 * either "new" or "error" here; the caller stamps "existing" / "skip" after a
 * batch lookup against the User table.
 */
export function normaliseRow(
  row: readonly string[],
  headerIndex: Partial<Record<CanonicalField, number>>,
  rowNumber: number,
): ImportPreviewRow {
  const get = (field: CanonicalField): string => {
    const i = headerIndex[field];
    return i === undefined ? "" : (row[i] ?? "").trim();
  };

  const { primary: email, extras: extraEmails } = splitEmails(get("email"));
  const firstName = get("firstName");
  const lastName = get("lastName");
  const phoneRaw = get("phone").replace(/\s+/g, " ").trim();

  const notes = buildNotes({
    address1: get("address1"),
    address2: get("address2"),
    city: get("city"),
    state: get("state"),
    postalCode: get("postalCode"),
    country: get("country"),
    phoneType: get("phoneType"),
    hours: get("hours"),
    extraEmails,
  });

  // Build a base row we'll return even on error so the preview can show what
  // was parsed. Email may be null for an error row; we coerce to "" in that
  // case so the column rendering stays simple.
  const base: ImportPreviewRow = {
    rowNumber,
    status: "new",
    email: email ?? "",
    firstName,
    lastName: lastName || null,
    phone: phoneRaw || null,
    notes,
  };

  if (!email) {
    return { ...base, status: "error", reason: "Missing or invalid email" };
  }

  const parsed = RowSchema.safeParse({
    email,
    firstName,
    lastName: lastName || undefined,
    phone: phoneRaw || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ...base, status: "error", reason: first.message };
  }

  return base;
}

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

export type ParsedRoster = {
  /** Canonical→column index for the preview UI to show "detected columns". */
  headerIndex: Partial<Record<CanonicalField, number>>;
  /** Source-spreadsheet headers, in order. */
  headers: string[];
  /** One per data row, in source order. */
  rows: ImportPreviewRow[];
  /** Headers we recognised. Display helper. */
  matched: CanonicalField[];
  /** Headers in the file we did NOT recognise (informational, not an error). */
  unrecognised: string[];
};

/**
 * Decode + normalise an upload in one call. Used by the preview action. The
 * "existing" / "skip" status stamping happens in `markDuplicates` once the
 * caller has the email set from the DB.
 */
export async function parseRoster(buffer: Buffer, filename: string): Promise<ParsedRoster> {
  if (buffer.length === 0) {
    throw new Error("That file is empty.");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${(buffer.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB — try splitting it.`,
    );
  }

  const { headers, rows: rawRows } = await parseBuffer(buffer, filename);
  if (rawRows.length === 0) {
    throw new Error("No data rows found below the header.");
  }
  if (rawRows.length > MAX_ROWS) {
    throw new Error(
      `That file has ${rawRows.length.toLocaleString()} rows. The limit is ${MAX_ROWS.toLocaleString()} per import — split it into chunks.`,
    );
  }

  const headerIndex = buildHeaderIndex(headers);
  if (headerIndex.email === undefined) {
    throw new Error(
      `Couldn't find an "Email" column. Expected one of: ${HEADER_ALIASES.email.join(", ")}.`,
    );
  }
  if (headerIndex.firstName === undefined) {
    throw new Error(
      `Couldn't find a "First name" column. Expected one of: ${HEADER_ALIASES.firstName.join(", ")}.`,
    );
  }

  const matched = (Object.keys(HEADER_ALIASES) as CanonicalField[]).filter(
    (f) => headerIndex[f] !== undefined,
  );
  const claimedIndices = new Set(Object.values(headerIndex));
  const unrecognised = headers.filter((_, i) => !claimedIndices.has(i)).filter((h) => h.length > 0);

  const rows = rawRows.map((row, i) => normaliseRow(row, headerIndex, i + 2)); // +2 because row 1 is the header and we're 1-based

  // Within-batch duplicate detection: if the same email appears twice in the
  // upload, only the first survives — the rest become "skip" with a clear
  // reason. Catches the common case of a coordinator double-pasting rows.
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.status !== "new") continue;
    if (seen.has(r.email)) {
      r.status = "skip";
      r.reason = "Duplicate of an earlier row in this file";
    } else {
      seen.add(r.email);
    }
  }

  return { headerIndex, headers, rows, matched, unrecognised };
}

/**
 * Stamp `existing` on rows whose email is already in the User table. The
 * caller passes the result of `db.user.findMany({ where: { email: { in: … } }})`
 * so we don't reach into the DB from this pure module.
 */
export function markExisting(roster: ParsedRoster, existingEmails: ReadonlySet<string>): ParsedRoster {
  for (const row of roster.rows) {
    if (row.status === "new" && existingEmails.has(row.email)) {
      row.status = "existing";
      row.reason = "An account already exists for this email";
    }
  }
  return roster;
}

/** Per-status counts for the preview header strip. */
export function summarise(roster: ParsedRoster): Record<ImportStatus, number> {
  const counts: Record<ImportStatus, number> = { new: 0, existing: 0, skip: 0, error: 0 };
  for (const r of roster.rows) counts[r.status] += 1;
  return counts;
}
