"use client";

import { useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { setBookingStatus, restoreShift } from "@/app/admin/actions";
import type { BookingStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";

/**
 * One roster row action (Mark attended / No-show / Undo / Reinstate). Full
 * 44px height because coordinators tap these on a phone at the door; the
 * button shows pending copy and disables itself so a second tap can't
 * double-submit, then a toast confirms what changed.
 */
export function RosterStatusButton({
  bookingId,
  status,
  label,
  pendingLabel,
  volunteerName,
  successMessage,
  variant = "outline",
  className,
}: {
  bookingId: string;
  status: BookingStatus;
  label: string;
  pendingLabel: string;
  /** Appended to the spoken label ("Mark attended, Jane Doe") so a list of
   *  identical buttons is still distinguishable by screen reader. */
  volunteerName: string;
  successMessage: string;
  variant?: "outline" | "ghost" | "default";
  className?: string;
}) {
  return (
    <form
      action={async (formData) => {
        await setBookingStatus(formData);
        toast.success(successMessage);
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        label={label}
        pendingLabel={pendingLabel}
        ariaLabel={`${label}, ${volunteerName}`}
        variant={variant}
        className={className}
      />
    </form>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  ariaLabel,
  variant,
  className,
}: {
  label: string;
  pendingLabel: string;
  ariaLabel: string;
  variant: "outline" | "ghost" | "default";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-label={pending ? undefined : ariaLabel}
      className={className}
    >
      {pending ? <Loader2 className="motion-safe:animate-spin" /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** Puts a cancelled shift back on the schedule, from the Cancelled banner. */
export function RestoreShiftButton({ shiftId }: { shiftId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData();
          fd.set("shiftId", shiftId);
          const res = await restoreShift(fd);
          if (res.error) toast.error(res.error);
          else toast.success("Shift restored. It's back on the schedule.");
        })
      }
      className="bg-leaf-deep hover:bg-leaf-ink"
    >
      {pending ? (
        <Loader2 className="motion-safe:animate-spin" />
      ) : (
        <RotateCcw />
      )}
      {pending ? "Restoring…" : "Restore shift"}
    </Button>
  );
}

const FLASH: Record<string, string> = {
  created: "Shift created.",
  saved: "Changes saved.",
};

/**
 * Create/edit redirect here with `?flash=…`; toast once, then drop the
 * param so a refresh or a shared link doesn't repeat it.
 */
export function ShiftFlash({ flash }: { flash?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (!flash || shown.current) return;
    shown.current = true;
    const message = FLASH[flash];
    if (message) toast.success(message);
    router.replace(pathname, { scroll: false });
  }, [flash, pathname, router]);

  return null;
}

