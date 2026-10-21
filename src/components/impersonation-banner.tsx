import { currentUser } from "@/lib/auth";
import { impersonationContext } from "@/lib/impersonation";
import { fullName } from "@/lib/users";
import { stopImpersonationAction } from "@/app/auth/actions";

/**
 * Sticky top-of-page banner shown only while an admin is impersonating a
 * volunteer. Mounted in the root layout so it follows the admin everywhere
 * they navigate. One-click "Stop" via the Server Action — no client JS.
 *
 * It's a fixed single row (h-12) so it can publish its height as
 * `--impersonation-offset`; sticky headers (SiteNav) use that as their `top`
 * and stack underneath instead of being covered.
 */
export async function ImpersonationBanner() {
  const ctx = await impersonationContext();
  if (!ctx) return null;
  const target = await currentUser();
  if (!target) return null;

  return (
    <>
      <style>{`:root{--impersonation-offset:3rem}`}</style>
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 flex h-12 items-center justify-between gap-3 border-b border-tomato-deep bg-tomato-deep px-4 text-sm text-white shadow-sm"
      >
        <p className="min-w-0 truncate">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
            Impersonating
          </span>{" "}
          <span className="font-semibold">{fullName(target)}</span>
          <span className="ml-1 hidden sm:inline">({target.email})</span>
          <span className="ml-2 hidden md:inline">
            · signed in as {fullName(ctx.admin)}
          </span>
        </p>
        <form action={stopImpersonationAction} className="shrink-0">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-white px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tomato-deep outline-none transition-colors hover:bg-cream focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tomato-deep"
          >
            Stop<span className="hidden sm:inline">&nbsp;impersonating</span>
          </button>
        </form>
      </div>
    </>
  );
}
