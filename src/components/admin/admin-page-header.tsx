import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The single header for every /admin page: optional back link to the parent
 * list, mono eyebrow (the section name), h1 with no trailing full stop,
 * optional description and right-aligned actions. Plain English only.
 */
export function AdminPageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
}: {
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {back ? (
        <Link
          href={back.href}
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="display mt-2 text-balance text-3xl font-bold leading-tight md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-pretty text-foreground/70">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
