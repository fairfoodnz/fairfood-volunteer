/** "or" rule separating the password form from social / passkey sign-in. */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-widest text-foreground/45">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
