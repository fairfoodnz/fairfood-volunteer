"use client";

import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cancelShift } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-tomato text-cream hover:bg-tomato/90"
    >
      {pending ? "Cancelling…" : "Cancel shift"}
    </Button>
  );
}

export function CancelShiftDialog({
  shiftId,
  bookedCount,
}: {
  shiftId: string;
  bookedCount: number;
}) {
  const one = bookedCount === 1;
  const booked =
    bookedCount > 0
      ? `${bookedCount} volunteer${one ? " is" : "s are"} booked on this shift. Cancelling removes it from the public schedule and they will lose their spot${one ? "" : "s"} — you'll need to let them know.`
      : "This removes the shift from the public schedule. No one is booked yet, so no volunteers are affected.";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="border-tomato/40 text-tomato hover:bg-tomato/10 hover:text-tomato"
          />
        }
      >
        Cancel shift
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-tomato/12 text-tomato"
          >
            <AlertTriangle className="size-5" />
          </span>
          <DialogTitle>Cancel this shift?</DialogTitle>
          <DialogDescription>{booked}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep shift
          </DialogClose>
          <form action={cancelShift}>
            <input type="hidden" name="shiftId" value={shiftId} />
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
