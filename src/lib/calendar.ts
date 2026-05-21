// "Add to calendar" for booked shifts: an RFC 5545 .ics payload (attached to
// the confirmation email for Apple Mail / native calendars) plus deep links
// for the web calendars that don't read attachments (Google, Outlook,
// Office 365, Yahoo).
//
// Shift times are stored as UTC instants (`Shift.startsAt` / `endsAt`), so we
// emit UTC `…Z` timestamps everywhere. That's unambiguous in every client and
// avoids hand-maintaining a Pacific/Auckland VTIMEZONE table across the DST
// boundary — each client localises the instant to whatever the viewer is in.

export type CalendarEvent = {
  /** Stable per-booking id → calendars dedupe/replace rather than duplicate. */
  uid: string;
  title: string;
  /** Plain text; newlines allowed (escaped/encoded per target). */
  description: string;
  location: string;
  start: Date;
  end: Date;
  /** Canonical link back to the booking (the shift detail page). */
  url: string;
};

export type CalendarLinks = {
  google: string;
  outlook: string;
  office365: string;
  yahoo: string;
};

/** RFC 5545 §3.3.11 TEXT escaping — backslash, comma, semicolon, newline. */
function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 §3.1 content-line folding: a content line longer than 75 octets is
 * split, each continuation prefixed with a single space. The limit is in
 * *octets*, not characters — a te reo macron (e.g. ā, U+0101) is one JS char
 * but two UTF-8 bytes, so a char-count fold runs late and can emit an
 * over-long line that strict parsers reject. We measure with
 * Buffer.byteLength and only ever fold on a code-point boundary, since §3.1
 * forbids splitting a multi-octet character across a fold.
 */
function foldICSLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;
  const chunks: string[] = [];
  let cur = "";
  let curBytes = 0;
  // First line gets the full 75; continuations spend one octet on the leading
  // space, so their own content caps at 74.
  let limit = 75;
  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, "utf8");
    if (curBytes + chBytes > limit) {
      chunks.push(cur);
      cur = ch;
      curBytes = chBytes;
      limit = 74;
    } else {
      cur += ch;
      curBytes += chBytes;
    }
  }
  chunks.push(cur);
  return chunks[0] + chunks.slice(1).map((c) => "\r\n " + c).join("");
}

/** UTC basic format `YYYYMMDDTHHMMSSZ` — the iCalendar / Google / Yahoo shape. */
function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** ISO 8601 with seconds + `Z` — what the Outlook/Office deeplinks expect. */
function isoStamp(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * A complete single-event VCALENDAR. `METHOD:PUBLISH` + `STATUS:CONFIRMED`
 * makes Apple/Google/Outlook treat the attachment as "add this to my
 * calendar" rather than a meeting invite needing an RSVP. CRLF line endings
 * are mandatory per spec — some parsers reject bare LF.
 */
export function buildICS(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fair Food NZ//Volunteer Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(event.start)}`,
    `DTEND:${icsStamp(event.end)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
    `LOCATION:${escapeICSText(event.location)}`,
    `URL:${event.url}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 §3.1 requires *every* content line, including the last, to end
  // with CRLF. Lenient clients (Apple Calendar) cope without the trailing one;
  // Google's server-side importer and other strict parsers reject the file.
  return lines.map(foldICSLine).join("\r\n") + "\r\n";
}

/** Deep links for the web calendars that ignore .ics attachments. */
export function calendarLinks(event: CalendarEvent): CalendarLinks {
  const start = icsStamp(event.start);
  const end = icsStamp(event.end);

  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", event.title);
  google.searchParams.set("dates", `${start}/${end}`);
  google.searchParams.set("details", event.description);
  google.searchParams.set("location", event.location);

  const outlook = new URL(
    "https://outlook.live.com/calendar/0/deeplink/compose",
  );
  outlook.searchParams.set("path", "/calendar/action/compose");
  outlook.searchParams.set("rru", "addevent");
  outlook.searchParams.set("subject", event.title);
  outlook.searchParams.set("startdt", isoStamp(event.start));
  outlook.searchParams.set("enddt", isoStamp(event.end));
  outlook.searchParams.set("body", event.description);
  outlook.searchParams.set("location", event.location);

  // Office 365 (work/school accounts) — same params, different host.
  const office365 = new URL(
    "https://outlook.office.com/calendar/0/deeplink/compose",
  );
  office365.search = outlook.search;

  const yahoo = new URL("https://calendar.yahoo.com/");
  yahoo.searchParams.set("v", "60");
  yahoo.searchParams.set("title", event.title);
  yahoo.searchParams.set("st", start);
  yahoo.searchParams.set("et", end);
  yahoo.searchParams.set("desc", event.description);
  yahoo.searchParams.set("in_loc", event.location);

  return {
    google: google.toString(),
    outlook: outlook.toString(),
    office365: office365.toString(),
    yahoo: yahoo.toString(),
  };
}

/**
 * Single source of truth for the shape of a booking's calendar event. Used by
 * both the confirmation email (`bookShiftAction` / `bookShiftsAction`) and the
 * volunteer-facing "Add to calendar" affordance on `/me` and `/shifts/[id]`,
 * so the title/description/location/UID stay identical across every surface
 * — calendars dedupe by UID, so a mismatch would create a duplicate entry
 * when a volunteer adds the same shift from two places.
 */
export function buildBookingCalendarEvent(args: {
  bookingId: string;
  programTitle: string;
  location: string;
  start: Date;
  end: Date;
  appOrigin: string;
  shiftId: string;
  notes?: string | null;
}): CalendarEvent {
  const manageUrl = `${args.appOrigin}/me`;
  return {
    uid: `booking-${args.bookingId}@volunteer.fairfood.org.nz`,
    title: `${args.programTitle} shift — Fair Food NZ`,
    description: [
      `You're volunteering with Fair Food NZ on the ${args.programTitle} programme.`,
      args.notes ? `Your note: ${args.notes}` : null,
      `Manage your booking: ${manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    location: args.location,
    start: args.start,
    end: args.end,
    url: `${args.appOrigin}/shifts/${args.shiftId}`,
  };
}
