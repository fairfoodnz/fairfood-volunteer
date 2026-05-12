"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookShiftAction, type BookState } from "../actions";

export function BookForm({
  shiftId,
  user,
}: {
  shiftId: string;
  user: { name: string; email: string } | null;
}) {
  const [state, action, pending] = useActionState<BookState, FormData>(
    bookShiftAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shiftId" value={shiftId} />
      <div className="space-y-1">
        <p className="eyebrow text-leaf-deep">Book this shift</p>
        <h3 className="display text-xl font-semibold">
          {user ? `Lock it in, ${user.name.split(" ")[0]}` : "Sign up to book"}
        </h3>
        {!user && (
          <p className="text-sm text-foreground/70">
            We&rsquo;ll get you set up in two minutes and bring you straight
            back to this shift.
          </p>
        )}
      </div>

      {user && (
        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Anything we should know? <span className="text-foreground/50">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Allergies, mobility needs, support person joining…"
            className="resize-none"
          />
        </div>
      )}

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      {user ? (
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
        >
          {pending ? "Booking…" : "Confirm booking"}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            asChild
            size="lg"
            className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
          >
            <Link href={`/auth/sign-up?next=${encodeURIComponent(`/shifts/${shiftId}`)}`}>
              Create account & book →
            </Link>
          </Button>
          <p className="text-center text-sm text-foreground/65">
            Already have an account?{" "}
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(`/shifts/${shiftId}`)}`}
              className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </form>
  );
}
