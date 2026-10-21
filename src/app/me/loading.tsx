import { Skeleton } from "@/components/ui/skeleton";

/**
 * /me is force-dynamic, so a cold navigation waits on the database. Show the
 * dashboard's shape straight away: header with its actions, the "Next up"
 * card and a couple of later bookings (matching me/page.tsx).
 *
 * The real SiteNav reads the session, so it isn't rendered here; a bar of the
 * same height keeps the layout from jumping when the page streams in.
 */
export default function MeLoading() {
  return (
    <div aria-busy="true" className="flex-1">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden className="h-16 border-b border-border/60" />
      <div aria-hidden className="container-x py-12 md:py-16">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-2xl">
            <Skeleton className="h-3 w-28 bg-foreground/10" />
            <Skeleton className="mt-4 h-10 w-full max-w-md bg-foreground/10 md:h-12" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>

        <Skeleton className="h-8 w-36" />
        <div className="mt-4 rounded-md border border-border bg-card p-5 md:p-6">
          <Skeleton className="h-3 w-16" />
          <div className="mt-4 flex items-start gap-4 md:gap-6">
            <Skeleton className="size-16 shrink-0 md:size-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48 md:h-7" />
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>

        <ul className="mt-7 space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-5"
            >
              <Skeleton className="size-14 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-52 max-w-full" />
              </div>
              <Skeleton className="hidden h-11 w-40 md:block" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
