import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * MASTER.md empty state: dashed border, centred, one inline leaf-deep link.
 * Copy is the caller's — keep admin wording in plain English.
 */
export function EmptyState({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border bg-card p-10 text-center",
        className,
      )}
    >
      <p className="text-foreground/70">
        {children}
        {action ? (
          <>
            {" "}
            <Link
              href={action.href}
              className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
            >
              {action.label}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
