import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shift detail is force-dynamic too. Without its own loading file it would
 * inherit /shifts/loading.tsx and flash a list of cards before a single shift,
 * so this mirrors the detail layout: title block, description card, roster
 * chips, and the booking card in the aside.
 */
export default function ShiftLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex-1">
      <span className="sr-only">Loading shift…</span>
      <div aria-hidden className="h-16 border-b border-border/60" />
      <div aria-hidden className="container-x py-12 md:py-16">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full max-w-sm md:h-12" />
              <Skeleton className="h-6 w-64" />
            </div>
            <Skeleton className="h-44 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full max-w-xs" />
              <div className="flex flex-wrap gap-2">
                {[16, 20, 14, 18].map((w, i) => (
                  <Skeleton
                    key={i}
                    className="h-7 rounded-full"
                    style={{ width: `${w * 0.25}rem` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-48" />
            <Skeleton className="mt-6 h-24 w-full" />
            <Skeleton className="mt-4 h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
