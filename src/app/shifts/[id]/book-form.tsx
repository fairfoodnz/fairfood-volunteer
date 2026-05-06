"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  if (state.ok) {
    return (
      <div className="space-y-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-leaf/15 text-leaf-deep">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 className="display text-xl font-semibold">You&rsquo;re booked in</h3>
        <p className="text-sm text-foreground/75">
          We&rsquo;ve emailed a confirmation and a magic link so you can manage
          your shifts on this device.
        </p>
        {state.magicLink && (
          <div className="rounded-md border border-dashed border-leaf/40 bg-leaf/5 p-3 text-xs">
            <p className="mb-1 font-mono uppercase tracking-widest text-foreground/55">
              Dev only — magic link
            </p>
            <Link href={state.magicLink} className="break-all font-mono text-leaf-deep underline">
              {state.magicLink}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shiftId" value={shiftId} />
      <div className="space-y-1">
        <p className="eyebrow text-leaf-deep">Book this shift</p>
        <h3 className="display text-xl font-semibold">
          {user ? `Lock it in, ${user.name.split(" ")[0]}` : "Two quick details"}
        </h3>
      </div>

      {!user && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" required placeholder="e.g. Aroha Williams" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11"
            />
          </div>
        </>
      )}

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

      {state.error && <p className="text-sm text-destructive" dangerouslySetInnerHTML={{ __html: state.error }} />}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full bg-leaf text-base font-semibold hover:bg-leaf-deep"
      >
        {pending ? "Booking…" : user ? "Confirm booking" : "Book my spot"}
      </Button>

      {!user && (
        <p className="text-xs text-foreground/55">
          We&rsquo;ll email you a magic link too, so you can manage this booking
          later. No password needed.
        </p>
      )}
    </form>
  );
}
