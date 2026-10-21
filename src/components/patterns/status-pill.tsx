import { cn } from "@/lib/utils";

export type PillTone = "positive" | "warning" | "neutral" | "danger" | "solid" | "info";

// MASTER.md pill palette, using the text-safe -deep steps (all ≥4.5:1 on
// their tint over cream or white).
const TONES: Record<PillTone, string> = {
  positive: "bg-leaf/10 text-leaf-deep",
  warning: "bg-tomato/10 text-tomato-deep",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-foreground/10 text-foreground/75",
  info: "bg-clay/10 text-clay",
  solid: "bg-leaf-deep text-white",
};

/**
 * Small uppercase status pill. The label carries the meaning — never rely on
 * the colour alone.
 */
export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
