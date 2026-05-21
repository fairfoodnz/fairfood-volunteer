"use client";

import { CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CalendarLinks } from "@/lib/calendar";

type Size = "sm" | "default";

/**
 * Per-booking "Add to calendar" affordance for logged-in volunteers. The .ics
 * download goes through the owner-scoped API route so we never inline the
 * payload into HTML (a copy/paste of the page source would otherwise leak
 * another volunteer's booking note). Web-calendar deep links are safe to
 * inline — they're the same params the confirmation email uses.
 */
export function AddToCalendar({
  bookingId,
  links,
  size = "sm",
  triggerLabel = "Add to calendar",
}: {
  bookingId: string;
  links: CalendarLinks;
  size?: Size;
  triggerLabel?: string;
}) {
  const icsHref = `/api/bookings/${bookingId}/ics`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size={size}>
            <CalendarPlus className="size-4" aria-hidden />
            {triggerLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Add this shift to</DropdownMenuLabel>
        <DropdownMenuItem
          render={
            // Native <a download> so the browser saves the .ics instead of
            // trying to navigate to it. The route serves `attachment`, so this
            // works even on browsers that ignore the attribute on cross-origin
            // links — same-origin here, so it's belt-and-braces.
            <a href={icsHref} download>
              <Download className="size-4" aria-hidden />
              <span>Apple Calendar / iCal (.ics)</span>
            </a>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <a href={links.google} target="_blank" rel="noopener noreferrer">
              Google Calendar
            </a>
          }
        />
        <DropdownMenuItem
          render={
            <a href={links.outlook} target="_blank" rel="noopener noreferrer">
              Outlook.com
            </a>
          }
        />
        <DropdownMenuItem
          render={
            <a href={links.office365} target="_blank" rel="noopener noreferrer">
              Office 365
            </a>
          }
        />
        <DropdownMenuItem
          render={
            <a href={links.yahoo} target="_blank" rel="noopener noreferrer">
              Yahoo Calendar
            </a>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
