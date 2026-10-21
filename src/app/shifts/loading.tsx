import { Skeleton } from "@/components/ui/skeleton";

/**
 * /shifts is force-dynamic, so a cold navigation waits on the database. Show
 * the page's shape straight away instead of a blank screen: the header band,
 * the filter chips and a week of shift cards (compact rows on phones, photo
 * cards from md up, matching shifts-list.tsx).
 *
 * The real SiteNav reads the session, so it isn't rendered here; a bar of the
 * same height keeps the layout from jumping when the page streams in.
 */
export default function ShiftsLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex-1">
      <span className="sr-only">Loading open shifts…</span>
      <div aria-hidden className="h-16 border-b border-border/60" />
      <div aria-hidden>
        <div className="border-b border-border bg-cream-deep">
          <div className="container-x py-12 md:py-16">
            <Skeleton className="h-3 w-20 bg-foreground/10" />
            <Skeleton className="mt-4 h-10 w-full max-w-md bg-foreground/10 md:h-12" />
            <Skeleton className="mt-4 h-5 w-full max-w-xl bg-foreground/10" />
            <div className="mt-7 flex flex-wrap gap-2">
              {[16, 24, 28, 20].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-11 rounded bg-foreground/10"
                  style={{ width: `${w * 0.25}rem` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="container-x space-y-8 py-12 md:py-16">
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-16" />
          </div>
          {[3, 2].map((count, day) => (
            <div key={day}>
              <Skeleton className="mb-3 h-6 w-52 md:mb-4" />
              <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                {Array.from({ length: count }, (_, i) => (
                  <li
                    key={i}
                    className="flex overflow-hidden rounded-md border border-border bg-card md:flex-col"
                  >
                    <Skeleton className="w-16 shrink-0 rounded-none md:aspect-[5/3] md:w-full" />
                    <div className="flex flex-1 flex-col gap-2 py-3 pl-4 pr-14 md:gap-3 md:p-5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-40 md:w-56" />
                      <Skeleton className="mt-1 h-4 w-28 md:mt-3 md:h-7" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
