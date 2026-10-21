/** A single headline number on an admin page (dashboard, profile, import). */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-foreground/70">
        {label}
      </p>
      <p className="display mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground/70">{hint}</p> : null}
    </div>
  );
}
