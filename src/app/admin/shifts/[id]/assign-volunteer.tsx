"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  assignBookingAction,
  searchAssignableVolunteers,
  type AssignBookingState,
  type VolunteerSearchHit,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/patterns/status-pill";
import { countOf } from "@/lib/format";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SEARCH_DEBOUNCE_MS = 200;

function displayName(u: VolunteerSearchHit) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

function initials(u: VolunteerSearchHit) {
  const first = u.firstName?.[0] ?? "";
  const last = u.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || u.email[0]?.toUpperCase() || "?";
}

export function AssignVolunteerDialog({
  shiftId,
  open,
  onOpenChange,
}: {
  shiftId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mount the body only while open so its state resets each time the
         * dialog is reopened — no manual reset effects needed. */}
        {open && (
          <AssignVolunteerBody
            shiftId={shiftId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignVolunteerBody({
  shiftId,
  onClose,
}: {
  shiftId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VolunteerSearchHit[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [picked, setPicked] = useState<VolunteerSearchHit | null>(null);

  const [state, action] = useActionState<AssignBookingState, FormData>(
    assignBookingAction,
    {},
  );

  // Debounced search keyed off `query`. Empty query also triggers a fetch so
  // the coordinator sees the most-active volunteers as a sensible default
  // starting list — beats an empty results box.
  useEffect(() => {
    const handle = setTimeout(() => {
      startSearch(async () => {
        const hits = await searchAssignableVolunteers(shiftId, query);
        setResults(hits);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, shiftId]);

  // Success → toast + close. The page revalidates server-side, so the new
  // row appears on the roster as the dialog finishes its close animation.
  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      onClose();
    }
  }, [state, onClose]);

  return (
    <>
      <DialogHeader>
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-leaf/15 text-leaf-deep"
        >
          <UserPlus className="size-5" />
        </span>
        <DialogTitle>
          {picked ? "Confirm assignment" : "Assign a volunteer"}
        </DialogTitle>
        <DialogDescription>
          {picked
            ? "Add a private note for the coordinator log, and choose whether to email the volunteer."
            : "Search by name or email. Adding someone here books them just like a public sign-up."}
        </DialogDescription>
      </DialogHeader>

      {picked ? (
        <ConfirmStep
          shiftId={shiftId}
          user={picked}
          action={action}
          error={state.error}
          onBack={() => setPicked(null)}
        />
      ) : (
        <SearchStep
          query={query}
          onQueryChange={setQuery}
          searching={searching}
          results={results}
          onPick={setPicked}
        />
      )}
    </>
  );
}

function SearchStep({
  query,
  onQueryChange,
  searching,
  results,
  onPick,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  searching: boolean;
  results: VolunteerSearchHit[] | null;
  onPick: (user: VolunteerSearchHit) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input when the dialog opens so the coordinator can
  // start typing immediately — saves a click.
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  const searchId = useId();
  const resultCount =
    results === null
      ? ""
      : results.length === 0
        ? query.trim()
          ? "No volunteers match that search."
          : "No volunteers in the system yet."
        : query.trim()
          ? `${countOf(results.length, "volunteer")} found${results.length === 10 ? " (showing the first 10)" : ""}.`
          : `Showing ${countOf(results.length, "recently active volunteer")}.`;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={searchId}>Find a volunteer</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65"
            aria-hidden
          />
          <Input
            ref={inputRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Name or email"
            className="pl-9"
            autoComplete="off"
          />
          {searching && (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65 motion-safe:animate-spin"
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Announces how many matched, so screen-reader users know the list
          below changed without having to go looking. */}
      <p role="status" aria-live="polite" className="text-xs text-foreground/70">
        {results === null ? "Looking…" : resultCount}
      </p>

      <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-card">
        {results === null ? (
          <p className="px-4 py-6 text-center text-sm text-foreground/70">
            Looking…
          </p>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-foreground/70">
            {resultCount}
          </p>
        ) : (
          <ul aria-label="Matching volunteers" className="divide-y divide-border">
            {results.map((u) => {
              const name = displayName(u);
              const disabled = u.alreadyOnRoster;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(u)}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-deep/60 focus-visible:bg-cream-deep/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-xs font-semibold uppercase tracking-wider text-leaf-deep"
                    >
                      {initials(u)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-foreground/70">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </span>
                    </span>
                    {u.alreadyOnRoster && (
                      <StatusPill tone="neutral">On roster</StatusPill>
                    )}
                    {u.reinstatable && !u.alreadyOnRoster && (
                      <StatusPill tone="warning">Reinstate</StatusPill>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Close
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function ConfirmStep({
  shiftId,
  user,
  action,
  error,
  onBack,
}: {
  shiftId: string;
  user: VolunteerSearchHit;
  action: (formData: FormData) => void;
  error?: string;
  onBack: () => void;
}) {
  const notesId = useId();
  const name = displayName(user);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shiftId" value={shiftId} />
      <input type="hidden" name="userId" value={user.id} />

      <div className="flex items-center gap-3 rounded-md border border-border bg-cream-deep/60 px-4 py-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-sm font-semibold uppercase tracking-wider text-leaf-deep"
        >
          {initials(user)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-foreground/65">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ""}
          </p>
        </div>
      </div>

      {user.reinstatable && (
        <p className="rounded-md border-l-2 border-tomato bg-tomato/10 px-3 py-2 text-sm text-tomato-deep">
          {name} had a cancelled or no-show booking on this shift. Confirming
          will reinstate it.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={notesId}>
          Private note{" "}
          <span className="font-normal text-foreground/65">(optional)</span>
        </Label>
        <Textarea
          id={notesId}
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="e.g. Called to confirm — happy to do prep this week"
          className="resize-none"
        />
      </div>

      <Label className="min-h-11 cursor-pointer items-start rounded-md border border-border bg-muted/40 p-3 font-normal leading-snug">
        <Checkbox name="notify" defaultChecked className="mt-0.5" />
        <span className="text-foreground/85">
          Email {name} a confirmation with the calendar invite
        </span>
      </Label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <SubmitButton />
      </DialogFooter>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-leaf-deep hover:bg-leaf-ink"
    >
      {pending ? "Adding…" : "Add to roster"}
    </Button>
  );
}

/**
 * A standalone trigger button so the page can place the CTA itself. When
 * assigning isn't possible, the reason is shown as visible helper text under
 * the (disabled) button rather than hidden in a tooltip.
 */
export function AssignVolunteerTrigger({
  shiftId,
  disabledReason,
}: {
  shiftId: string;
  /** Why assigning is unavailable; the button is disabled when set. */
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  if (disabledReason) {
    return (
      <div className="flex max-w-xs flex-col items-start gap-1.5 sm:items-end">
        <Button
          type="button"
          variant="outline"
          disabled
          aria-describedby={reasonId}
        >
          <UserPlus className="size-4" />
          Assign volunteer
        </Button>
        <p id={reasonId} className="text-xs text-foreground/70 sm:text-right">
          {disabledReason}
        </p>
      </div>
    );
  }
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-leaf-deep hover:bg-leaf-ink"
      >
        <UserPlus className="size-4" />
        Assign volunteer
      </Button>
      <AssignVolunteerDialog
        shiftId={shiftId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
