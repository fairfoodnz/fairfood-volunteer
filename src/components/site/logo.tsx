import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "default" | "light" | "leaf";

const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  // Dark forest circle, cream wordmark — matches the supplied dark logo.
  default: { bg: "bg-forest", fg: "text-cream" },
  // Cream circle, forest wordmark — for dark backgrounds.
  light: { bg: "bg-cream", fg: "text-forest" },
  // Kelly green circle, cream wordmark — for special accents.
  leaf: { bg: "bg-leaf", fg: "text-cream" },
};

export function LogoMark({
  className,
  variant = "default",
  size = 40,
}: {
  className?: string;
  variant?: Variant;
  size?: number;
}) {
  const v = VARIANTS[variant];
  return (
    <span
      className={cn(
        "relative inline-flex aspect-square items-center justify-center rounded-full",
        v.bg,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "brand flex flex-col items-center leading-[0.78] -tracking-[0.04em]",
          v.fg,
        )}
        style={{ fontSize: size * 0.32 }}
      >
        <span>fair</span>
        <span>food</span>
      </span>
    </span>
  );
}

export function Logo({
  className,
  variant = "default",
  size = 40,
  withText = false,
}: {
  className?: string;
  variant?: Variant;
  size?: number;
  withText?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="Fair Food"
    >
      <LogoMark variant={variant} size={size} />
      {withText && <span className="sr-only">Fair Food</span>}
    </Link>
  );
}
