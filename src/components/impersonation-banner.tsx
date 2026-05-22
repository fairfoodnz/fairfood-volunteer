import { currentUser } from "@/lib/auth";
import { impersonationContext } from "@/lib/impersonation";
import { fullName } from "@/lib/users";
import { stopImpersonationAction } from "@/app/auth/actions";

/**
 * Sticky top-of-page banner shown only while an admin is impersonating a
 * volunteer. Mounted in the root layout so it follows the admin everywhere
 * they navigate. One-click "Stop" via the Server Action — no client JS.
 */
export async function ImpersonationBanner() {
  const ctx = await impersonationContext();
  if (!ctx) return null;
  const target = await currentUser();
  if (!target) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-tomato/40 bg-tomato px-4 py-2 text-sm text-white shadow-sm"
    >
      <p className="min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
          Impersonating
        </span>{" "}
        <span className="font-semibold">{fullName(target)}</span>
        <span className="ml-1 hidden text-white/85 sm:inline">
          ({target.email})
        </span>
        <span className="ml-2 hidden text-white/75 md:inline">
          · signed in as {fullName(ctx.admin)}
        </span>
      </p>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="inline-flex h-7 items-center rounded-md bg-white/15 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] outline-none transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Stop impersonating
        </button>
      </form>
    </div>
  );
}
