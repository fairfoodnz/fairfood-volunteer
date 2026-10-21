import { cn } from "@/lib/utils";

/**
 * Volunteer-facing page header: eyebrow, display h1, optional lead and
 * actions. `band` puts it on the cream-deep header band used by the listing
 * pages (/shifts, /programs); otherwise it sits inline at the top of <main>.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  band = false,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  band?: boolean;
  /** Extra content under the lead (e.g. filter chips). */
  children?: React.ReactNode;
  className?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display mt-3 text-balance text-4xl font-bold leading-tight md:text-5xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-4 text-pretty text-lg text-foreground/70">{lead}</p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );

  if (band) {
    return (
      <header
        className={cn("border-b border-border bg-cream-deep", className)}
      >
        <div className="container-x py-12 md:py-16">{inner}</div>
      </header>
    );
  }
  return <header className={cn("mb-10", className)}>{inner}</header>;
}
