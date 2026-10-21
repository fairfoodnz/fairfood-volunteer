/**
 * Skeleton shown while an /admin page streams in: header, a row of stat
 * tiles and a table-shaped block. Generic enough to suit every admin page.
 */
export default function AdminLoading() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-14" aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden className="mx-auto max-w-6xl motion-safe:animate-pulse">
        <div className="h-3 w-20 rounded bg-foreground/10" />
        <div className="mt-4 h-9 w-72 max-w-full rounded bg-foreground/10" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-foreground/5" />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[6.5rem] rounded-md border border-border bg-card"
            />
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-md border border-border bg-card">
          <div className="h-11 bg-cream-deep" />
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-t border-border px-4 py-4"
            >
              <div className="h-4 w-1/3 rounded bg-foreground/10" />
              <div className="h-4 w-1/4 rounded bg-foreground/5" />
              <div className="ml-auto h-4 w-16 rounded bg-foreground/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
