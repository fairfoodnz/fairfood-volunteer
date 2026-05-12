"use client";

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
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "../actions";

export function CancelBookingDialog({ bookingId }: { bookingId: string }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-tomato/40 text-tomato hover:bg-tomato/10 hover:text-tomato"
          >
            Cancel shift
          </Button>
        }
      />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this shift?</DialogTitle>
          <DialogDescription>
            We&rsquo;ll free your spot for someone else. You can always rebook.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose render={<Button type="button" variant="ghost" autoFocus />}>
            Keep my spot
          </DialogClose>
          <form action={cancelBookingAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <Button
              type="submit"
              className="bg-tomato text-cream hover:bg-tomato/90"
            >
              Cancel shift
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
